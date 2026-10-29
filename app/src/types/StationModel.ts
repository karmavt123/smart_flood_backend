/**
 * MỘT PHIÊN BẢN CÔNG THỨC DỰ ĐOÁN của trạm (hồi quy tuyến tính, bản 3.1).
 * Máy chủ học lại mỗi ngày từ dữ liệu lúc đường ngập của CHÍNH trạm đó, rồi gửi hệ số mới xuống trạm
 * → mỗi trạm dần có công thức riêng, hợp với địa hình nơi đặt trạm.
 *
 *   Ĥ(t + 5 phút) = a0 + a1·H + a2·V + a3·R + a4·S        (Ĥ tính bằng mm)
 *   H = độ ngập hiện tại (mm), V = tốc độ thoát nước (mm/5 phút), R = lượng mưa trong 5 phút (mm), S = thủy triều (m)
 */
export interface StationModel {
  version: number;
  /** "server" = máy chủ học; "node" = trạm tự gửi lên. */
  source: 'node' | 'server';
  /** Máy chủ gửi phiên bản này xuống trạm lúc nào (ISO). */
  publishedAt: string | null;
  /** Trạm bắt đầu dùng phiên bản này lúc nào (ISO); null = trạm chưa báo. */
  appliedAt: string | null;
  /** Học xong phiên bản này lúc nào (ISO). */
  trainedAt: string | null;
  /** Học từ bao nhiêu mẫu dữ liệu. */
  samples: number | null;
  /** Dự đoán trước bao nhiêu phút. */
  horizonMinutes: number | null;
  /** Hệ số tự do. */
  intercept: number;
  /** Hệ số từng biến, vd { H: 0.985, V: 4.8 }. */
  coefficients: Record<string, number>;
  /** Sai số tuyệt đối trung bình (cm), đo trên phần dữ liệu để kiểm tra. */
  maeCm: number | null;
  rmseCm: number | null;
  r2: number | null;
  /** Máy chủ nhận phiên bản này lần đầu lúc nào (ISO). */
  firstSeenAt: string;
}
