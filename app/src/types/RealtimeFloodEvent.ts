import type { FloodLevel } from './FloodLevel';

/**
 * MỘT CẢNH BÁO REALTIME: app tự tạo khi nhận dữ liệu mới qua Socket.IO mà mức ngập của trạm
 * TĂNG lên (vd An toàn → Cảnh báo, Cảnh báo → Nguy hiểm). Dùng cho dải đỏ, thông báo, màn Cảnh báo.
 */
export interface RealtimeFloodEvent {
  nodeId: string;
  stationName: string;
  /** Độ sâu ngập lúc đo (cm). */
  waterLevelCm: number;
  /** Ngưỡng nguy hiểm của trạm (cm). */
  thresholdCm: number;
  level: FloodLevel;
  floodRadiusM: number;
  /** Thời điểm đo (ISO). */
  timestamp: string;
  /** Thời điểm điện thoại nhận được (ISO). */
  receivedAt: string;
}
