/**
 * QUY ƯỚC VỀ CÔNG THỨC DỰ ĐOÁN (bản 3.0, chốt 28/10/2026). Muốn đổi cách học thì sửa ở đây hoặc trong .env.
 *
 *   Ĥ(t+5) = a0 + a1·H + a2·V + a3·R + a4·S        (kết quả Ĥ tính bằng mm)
 *
 * Hệ số dùng ĐÚNG ĐƠN VỊ trong gói tin trạm gửi, để trạm cứ thế thay số vào công thức, không phải đổi đơn vị.
 */

/** Dự đoán độ ngập sau bao nhiêu phút. Trạm gửi 5 phút 1 lần nên cặp mẫu học cũng cách nhau 5 phút. */
export const PREDICTION_HORIZON_MIN = 5;

/** Các biến của công thức, theo đúng thứ tự hệ số a1..a4 — tên viết tắt dùng chung cho trạm, máy chủ, app. */
export const MODEL_VARIABLES = ['H', 'V', 'R', 'S'] as const;
export type ModelVariable = (typeof MODEL_VARIABLES)[number];

/** Ý nghĩa + đơn vị từng biến (in ra trang admin, tài liệu). */
export const MODEL_VARIABLE_TEXT: Record<ModelVariable, string> = {
  H: 'độ ngập hiện tại (mm) — water_level_mm',
  V: 'tốc độ dâng (mm/phút) — rise_rate_mm_min',
  R: 'lượng mưa (mm) — rain_mm',
  S: 'thủy triều (m) — tide_m',
};

/**
 * Ghép cặp (lúc t, lúc t+5 phút): lần đo "5 phút sau" được lệch tối đa ±90 giây
 * (đồng hồ trạm không chính xác tới từng giây, gửi có thể trễ vài giây).
 */
export const PAIR_TOLERANCE_SEC = 90;

/**
 * MỨC DAO ĐỘNG ĐIỂN HÌNH của từng biến (cùng đơn vị gói tin) — dùng khi "kéo về hệ số cũ":
 * đổi 1 hệ số làm dự báo lệch bao nhiêu khi biến đó dao động ở mức bình thường.
 * Nhờ vậy biến nào trong dữ liệu gần như không đổi (vd triều chỉ nhích 0,1 m) thì hệ số của nó
 * KHÔNG bị đẩy lên số khổng lồ để "khớp" vài mẫu — lỗi hay gặp của hồi quy khi ít dữ liệu.
 *   H 100 mm · V 5 mm/phút · R 5 mm · S 0,5 m
 */
export const VARIABLE_SCALES: Record<ModelVariable, number> = { H: 100, V: 5, R: 5, S: 0.5 };

/**
 * Trạm CHƯA có công thức thì máy chủ "kéo về" công thức đơn giản nhất: Ĥ(t+5) = H + 5·V
 * ("nước tiếp tục dâng đúng tốc độ hiện tại"). Chỉ dùng làm điểm tựa khi học, KHÔNG gửi xuống trạm:
 * nhờ vậy dữ liệu ít hoặc biến nào đó không đổi (vd cả đợt không mưa) thì công thức học ra vẫn hợp lý,
 * không bị lệch thành 1 hằng số. Thứ tự: [a0, aH, aV, aR, aS].
 */
export const STARTING_COEFFICIENTS = [0, 1, PREDICTION_HORIZON_MIN, 0, 0];

/**
 * Độ ngập 5 phút sau trong các mẫu phải dao động ít nhất chừng này (độ lệch chuẩn, mm).
 * Nước gần như đứng yên suốt (vd chỉ có vài phút dữ liệu lúc ngập ổn định) thì chưa học được gì.
 */
export const MIN_TARGET_SPREAD_MM = 5;

/** Phần dữ liệu MỚI NHẤT giữ lại để kiểm tra công thức (không dùng để học), 20%. */
export const VALIDATION_FRACTION = 0.2;
/** Phần kiểm tra ít nhất bao nhiêu cặp, ít hơn thì so sai số không đáng tin. */
export const MIN_VALIDATION_SAMPLES = 5;

/** Topic MQTT máy chủ gửi hệ số mới xuống trạm. Trạm subscribe đúng topic của mình. */
export function modelTopic(nodeId: string): string {
  return `smartflood/nodes/${nodeId}/model`;
}
