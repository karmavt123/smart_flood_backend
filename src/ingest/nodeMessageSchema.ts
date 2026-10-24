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

/** Thời gian: chuỗi ISO 8601 ("2026-10-25T14:05:00+07:00") hoặc số giây/mili-giây kiểu Unix. */
const timeValue = z.union([z.string().min(1).max(40), z.number()]);

/**
 * KHUÔN DỮ LIỆU 1 TIN NHẮN node gửi lên (đặc tả đầy đủ cho bên IoT: IOT_DATA_FORMAT.md).
 * Trường nào không có trong danh sách này vẫn được nhận và lưu nguyên vào cột `extra`.
 */
export const nodeMessageSchema = z.object({
  node_id: z
    .string()
    .regex(/^[A-Za-z0-9_.-]{1,64}$/, 'chỉ gồm chữ không dấu, số, dấu gạch ngang/gạch dưới/chấm, tối đa 64 ký tự')
    .optional(),
  measured_at: timeValue.nullish(),

  // 3 trường bắt buộc
  flood_depth_cm: requiredNumber(-20, 500),
  rain_mm_1h: requiredNumber(0, 500),
  tide_cm: requiredNumber(-1000, 1000),

  // các trường thêm
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
