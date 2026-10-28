/**
 * MỘT PHIÊN BẢN CÔNG THỨC DỰ ĐOÁN của trạm (hồi quy tuyến tính).
 * Lúc đầu mọi trạm dùng chung công thức v1; mỗi node TỰ HỌC LẠI trên thiết bị theo dữ liệu
 * của chính nó rồi gửi phiên bản mới (v2, v3...) lên máy chủ → mỗi trạm dần có công thức riêng.
 *
 *   Ĥ(t + 5 phút) = hệ số tự do + Σ (hệ số × biến)
 *   biến: H = độ ngập hiện tại, V = tốc độ dâng, T = nhiệt độ, RH = độ ẩm, L = ánh sáng
 */
export interface StationModel {
  version: number;
  /** Node học xong phiên bản này lúc nào (ISO). */
  trainedAt: string | null;
  /** Học từ bao nhiêu mẫu dữ liệu. */
  samples: number | null;
  /** Dự đoán trước bao nhiêu phút. */
  horizonMinutes: number | null;
  /** Hệ số tự do. */
  intercept: number;
  /** Hệ số từng biến, vd { H: 0.985, V: 4.8 }. */
  coefficients: Record<string, number>;
  /** Sai số tuyệt đối trung bình (cm) — node tự tính. */
  maeCm: number | null;
  rmseCm: number | null;
  r2: number | null;
  /** Máy chủ nhận phiên bản này lần đầu lúc nào (ISO). */
  firstSeenAt: string;
}
