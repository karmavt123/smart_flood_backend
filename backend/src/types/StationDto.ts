import type { ConnectionState } from './ConnectionState.js';
import type { FloodLevel } from './FloodLevel.js';

/** 1 lần đo, dạng gửi cho app (tên trường kiểu camelCase, thời gian là chuỗi ISO). */
export interface ReadingDto {
  measuredAt: string;
  receivedAt: string;
  /** "device" = giờ đo lấy từ thiết bị; "server" = thiết bị không gửi giờ (hoặc sai) nên lấy giờ máy chủ nhận. */
  timeSource: 'device' | 'server';
  /** Độ sâu nước ngập (cm). */
  floodDepthCm: number;
  /** Tốc độ dâng trạm tự tính (mm/phút), âm = đang rút; null = trạm không gửi. */
  riseRateMmMin: number | null;
  /** V — tốc độ thoát nước trạm gửi (mm/5 phút, gói tin 3.1); null = trạm không gửi. */
  drainMm5min: number | null;
  /** Lượng mưa node đo (mm; gói tin 3.1 = mưa trong 5 phút); null = node không gửi. */
  rainMm: number | null;
  /** Cường độ mưa (mm/giờ); null = node không gửi. */
  rainRateMmH: number | null;
  /** Kiểu gói tin cũ: tổng mưa 60 phút gần nhất (mm); null = node không gửi. */
  rainMm1h: number | null;
  /** Thủy triều (cm). App hiển thị theo mét (÷ 100). */
  tideCm: number;
  temperatureC: number | null;
  humidityPct: number | null;
  lightLux: number | null;
  batteryPct: number | null;
  rssiDbm: number | null;
  predictedDepthCm: number | null;
  forecastMinutes: number | null;
  modelVersion: number | null;
  source: 'mqtt' | 'import' | 'admin-test';
  extra: Record<string, unknown>;
}

/** 1 phiên bản công thức dự đoán của node, dạng gửi cho app. */
export interface ModelDto {
  version: number;
  /** "node" = trạm gửi lên; "server" = máy chủ học từ dữ liệu của trạm. */
  source: 'node' | 'server';
  /** Máy chủ gửi phiên bản này xuống trạm lúc nào (ISO); null = chưa gửi / trạm tự học. */
  publishedAt: string | null;
  /** Trạm bắt đầu dùng phiên bản này lúc nào (ISO); null = trạm chưa báo đang dùng. */
  appliedAt: string | null;
  trainedAt: string | null;
  samples: number | null;
  horizonMinutes: number | null;
  intercept: number;
  coefficients: Record<string, number>;
  maeCm: number | null;
  rmseCm: number | null;
  r2: number | null;
  firstSeenAt: string;
}

/** 1 trạm (node) kèm tình trạng mới nhất — app dùng cho bản đồ, danh sách, chi tiết trạm. */
export interface StationDto {
  nodeId: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  thresholds: { warningCm: number; dangerCm: number; criticalCm: number };
  expectedIntervalSec: number;
  isActive: boolean;
  connectionState: ConnectionState;
  /** Lần cuối có dữ liệu của node (ISO); null = chưa từng có. */
  lastSeenAt: string | null;
  /** Mức ngập theo lần đo cuối (có thể đã cũ — xem isFloodInfoUsable). */
  floodLevel: FloodLevel;
  /** true = dữ liệu còn mới (online/chậm) nên được vẽ vùng ngập và dùng khi kiểm tra tuyến. */
  isFloodInfoUsable: boolean;
  /** Bán kính vùng ảnh hưởng (m); 0 = không vẽ. Luôn 0 khi dữ liệu đã cũ. */
  influenceRadiusM: number;
  /** Mức ngập theo giá trị node dự đoán. */
  predictedLevel: FloodLevel;
  latest: ReadingDto | null;
  /** Phiên bản công thức mới nhất node đang dùng. */
  model: ModelDto | null;
}
