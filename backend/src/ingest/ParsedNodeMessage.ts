import type { LatLng } from '../types/LatLng.js';

/** 1 tin nhắn của node SAU KHI đã kiểm tra hợp lệ và chuẩn hóa — sẵn sàng lưu vào DB. */
export interface ParsedNodeMessage {
  nodeId: string;
  measuredAt: Date;
  timeSource: 'device' | 'server';
  /** Độ sâu nước ngập (cm) — node gửi water_level_mm thì đã chia 10. */
  floodDepthCm: number;
  /** Tốc độ dâng trạm tự tính (mm/phút), âm = nước đang rút; null = trạm không gửi. */
  riseRateMmMin: number | null;
  /** V — tốc độ thoát nước trạm tự tính (mm/5 phút, bản 3.1); null = gói tin kiểu cũ không có. */
  drainMm5min: number | null;
  /** Trạm đang dự báo bằng phiên bản công thức nào; null = chưa có công thức. */
  modelVersion: number | null;
  /** Lượng mưa node đo (mm). */
  rainMm: number | null;
  /** Cường độ mưa (mm/giờ) — node gửi rain_rate_mm_s thì đã nhân 3600. */
  rainRateMmH: number | null;
  /** Kiểu cũ: tổng mưa 60 phút gần nhất (mm). */
  rainMm1h: number | null;
  /** Thủy triều (cm) — node gửi tide_m thì đã nhân 100. */
  tideCm: number;
  temperatureC: number | null;
  humidityPct: number | null;
  lightLux: number | null;
  batteryPct: number | null;
  rssiDbm: number | null;
  prediction: { depthCm: number; horizonMinutes: number } | null;
  model: {
    version: number;
    trainedAt: Date | null;
    samples: number | null;
    horizonMinutes: number | null;
    intercept: number;
    coefficients: Record<string, number>;
    maeCm: number | null;
    rmseCm: number | null;
    r2: number | null;
  } | null;
  location: LatLng | null;
  /** Các trường lạ node gửi thêm (lưu nguyên). */
  extra: Record<string, unknown>;
}
