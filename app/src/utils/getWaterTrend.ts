import type { SensorReading } from '@/types/SensorReading';

export type WaterTrend = 'rising' | 'falling' | 'steady';

/** Chênh lệch nhỏ hơn mức này (mm) giữa dự báo và hiện tại thì coi là "Ổn định" — sai số cảm biến ~1–2 mm. */
const STEADY_BAND_MM = 2;

export const WATER_TREND_TEXT: Record<WaterTrend, string> = {
  rising: 'Đang dâng',
  falling: 'Đang rút',
  steady: 'Ổn định',
};

/**
 * XU HƯỚNG NƯỚC dựa trên số TRẠM GỬI: so độ ngập dự báo sau 5 phút (H5) với độ ngập hiện tại (H).
 *   H5 − H > 2 mm → Đang dâng · H5 − H < −2 mm → Đang rút · còn lại → Ổn định.
 * Trạm chưa gửi dự báo (chưa có H5) thì trả null → app không ghi xu hướng.
 */
export function getWaterTrend(reading: SensorReading | null): WaterTrend | null {
  if (!reading || reading.waterLevelCm === null || reading.predictedDepthCm === null) return null;
  const diffMm = (Math.max(0, reading.predictedDepthCm) - reading.waterLevelCm) * 10;
  if (diffMm > STEADY_BAND_MM) return 'rising';
  if (diffMm < -STEADY_BAND_MM) return 'falling';
  return 'steady';
}
