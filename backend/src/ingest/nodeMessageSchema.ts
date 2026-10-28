import { z } from 'zod';

/** Node gửi số dạng chuỗi ("12.5") cũng chấp nhận; nhưng chuỗi rỗng / null KHÔNG bị đổi thành 0. */
function numericStringToNumber(value: unknown) {
  if (typeof value === 'string' && /^\s*-?\d+(\.\d+)?\s*$/.test(value)) return Number(value);
  return value;
}

/** Số bắt buộc trong khoảng [min, max]. */
const requiredNumber = (min: number, max: number) => z.preprocess(numericStringToNumber, z.number().min(min).max(max));
/** Số không bắt buộc: thiếu hoặc null đều được (lưu NULL, không phải 0). */
const optionalNumber = (min: number, max: number) => requiredNumber(min, max).nullish();
const optionalInteger = (min: number, max: number) =>
  z.preprocess(numericStringToNumber, z.number().int().min(min).max(max)).nullish();

/** Thời gian: chuỗi ISO 8601 ("2026-10-25T14:05:00+07:00"), chỉ giờ ("14:05:30") hoặc số giây/mili-giây kiểu Unix. */
const timeValue = z.union([z.string().min(1).max(40), z.number()]);

const nodeIdValue = z
  .string()
  .regex(/^[A-Za-z0-9_.-]{1,64}$/, 'chỉ gồm chữ không dấu, số, dấu gạch ngang/gạch dưới/chấm, tối đa 64 ký tự');

/**
 * KHUÔN DỮ LIỆU 1 TIN NHẮN node gửi lên (đặc tả đầy đủ cho bên IoT: IOT_DATA_FORMAT.md).
 *
 * Nhận các KIỂU TÊN TRƯỜNG:
 *   - Bản 3.0 (từ 28/10/2026, trạm gửi thẳng qua Wi-Fi, 5 phút 1 lần):
 *       id, time, water_level_mm, rise_rate_mm_min, rain_mm, tide_m,
 *       predicted_water_level_mm, model_version (+ model khi vừa bật máy / vừa nhận công thức mới)
 *   - Bản 2.0 (26/10/2026): id, time, water_level_mm, rain_mm, rain_rate_mm_s, tide_m, temperature_c
 *   - Kiểu cũ (vẫn nhận, để không phải sửa lại dữ liệu đã có):
 *       node_id, measured_at, flood_depth_cm, rain_mm_1h, tide_cm
 * Ở đây trường nào cũng là "không bắt buộc"; việc kiểm tra đủ ngập / mưa / triều làm ở parseNodeMessage
 * để báo lỗi dễ hiểu ("thiếu mực nước ngập") thay vì liệt kê cả 2 tên trường.
 *
 * Trường nào không có trong danh sách này vẫn được nhận và lưu nguyên vào cột `extra`.
 */
export const nodeMessageSchema = z.object({
  // --- mã node + thời điểm đo ---
  id: nodeIdValue.optional(), // kiểu mới
  node_id: nodeIdValue.optional(), // kiểu cũ
  time: timeValue.nullish(), // kiểu mới: "14:05:30" hoặc "14/05/30" (chỉ giờ) — ISO / số Unix cũng được
  date: z.string().min(1).max(20).nullish(), // kiểu mới, không bắt buộc: "2026-10-26" hoặc "26/10/2026"
  measured_at: timeValue.nullish(), // kiểu cũ

  // --- mực nước ngập (bắt buộc 1 trong 2) ---
  water_level_mm: optionalNumber(-200, 5000), // kiểu mới, mm
  flood_depth_cm: optionalNumber(-20, 500), // kiểu cũ, cm

  // --- bản 3.0: tốc độ dâng + dự báo trạm tự tính ---
  rise_rate_mm_min: optionalNumber(-1000, 1000), // (mực nước bây giờ − 5 phút trước) ÷ 5, mm/phút; âm = nước đang rút
  predicted_water_level_mm: optionalNumber(-200, 5000), // độ ngập trạm dự báo sau 5 phút, mm
  model_version: optionalInteger(1, 1_000_000), // trạm đang dự báo bằng phiên bản công thức nào

  // --- mưa (bắt buộc ít nhất 1 trong 4) ---
  rain_mm: optionalNumber(0, 100_000), // lượng mưa (mm)
  rain_rate_mm_s: optionalNumber(0, 1), // cường độ mưa (mm/giây) — 1 mm/s đã là 3600 mm/giờ
  rain_rate_mm_h: optionalNumber(0, 3600), // cường độ mưa (mm/giờ)
  rain_mm_1h: optionalNumber(0, 500), // kiểu cũ: tổng mưa 60 phút gần nhất (mm)

  // --- thủy triều (bắt buộc 1 trong 2) ---
  tide_m: optionalNumber(-10, 10), // kiểu mới, m
  tide_cm: optionalNumber(-1000, 1000), // kiểu cũ, cm

  // --- các trường thêm ---
  temperature_c: optionalNumber(-20, 80),
  humidity_pct: optionalNumber(0, 100),
  light_lux: optionalNumber(0, 200000),
  battery_pct: optionalNumber(0, 100),
  rssi_dbm: optionalNumber(-200, 0),

  prediction: z
    .object({
      depth_cm: requiredNumber(-20, 500),
      horizon_min: z.preprocess(numericStringToNumber, z.number().int().min(1).max(1440)),
    })
    .nullish(),

  model: z
    .object({
      version: z.preprocess(numericStringToNumber, z.number().int().min(1)),
      trained_at: timeValue.nullish(),
      samples: optionalInteger(0, 100_000_000),
      horizon_min: optionalInteger(1, 1440),
      intercept: requiredNumber(-1e6, 1e6),
      coef: z
        .record(z.string().regex(/^[A-Za-z0-9_]{1,16}$/), requiredNumber(-1e6, 1e6))
        .refine((value) => Object.keys(value).length >= 1 && Object.keys(value).length <= 20, 'phải có từ 1 đến 20 hệ số'),
      mae_cm: optionalNumber(0, 1e6),
      rmse_cm: optionalNumber(0, 1e6),
      r2: optionalNumber(-1e6, 1),
    })
    .nullish(),

  location: z
    .object({
      lat: requiredNumber(-90, 90),
      lng: requiredNumber(-180, 180),
    })
    .nullish(),
});

/** Tên các trường đã có trong khuôn — trường khác node gửi thêm sẽ được cất vào `extra`. */
export const KNOWN_MESSAGE_KEYS = new Set(Object.keys(nodeMessageSchema.shape));

export type NodeMessageInput = z.infer<typeof nodeMessageSchema>;
