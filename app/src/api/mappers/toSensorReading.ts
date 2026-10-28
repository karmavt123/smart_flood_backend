import type { SensorReading } from '@/types/SensorReading';
import { toNumberOrNull } from '@/utils/toNumberOrNull';

/**
 * Chuyển 1 lần đo trong JSON máy chủ (measuredAt, floodDepthCm, rainMm, tideCm, ...) sang SensorReading.
 * Máy chủ lưu triều theo cm; app đổi lại sang mét cho giống số bên IoT gửi (1.35 m).
 * Không có thời điểm đo thì coi như không có dữ liệu (trả null).
 */
function centimetersToMeters(value: number | null): number | null {
  return value === null ? null : Math.round(value) / 100;
}

export function toSensorReading(raw: any, nodeId: string): SensorReading | null {
  if (!raw || typeof raw.measuredAt !== 'string') return null;
  return {
    nodeId,
    timestamp: raw.measuredAt,
    waterLevelCm: toNumberOrNull(raw.floodDepthCm),
    rainMm: toNumberOrNull(raw.rainMm),
    rainRateMmH: toNumberOrNull(raw.rainRateMmH),
    rainMm1h: toNumberOrNull(raw.rainMm1h),
    tideM: centimetersToMeters(toNumberOrNull(raw.tideCm)),
    temperatureC: toNumberOrNull(raw.temperatureC),
    humidityPct: toNumberOrNull(raw.humidityPct),
    lightLux: toNumberOrNull(raw.lightLux),
    batteryPct: toNumberOrNull(raw.batteryPct),
    rssiDbm: toNumberOrNull(raw.rssiDbm),
    predictedDepthCm: toNumberOrNull(raw.predictedDepthCm),
    forecastMinutes: toNumberOrNull(raw.forecastMinutes),
    modelVersion: toNumberOrNull(raw.modelVersion),
  };
}
