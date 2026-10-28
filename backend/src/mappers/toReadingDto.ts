import { toIsoString } from '../geo/toIsoString.js';
import type { ReadingRecord } from '../types/ReadingRecord.js';
import type { ReadingDto } from '../types/StationDto.js';

/** Đổi 1 dòng bảng readings sang dạng gửi cho app. */
export function toReadingDto(record: ReadingRecord): ReadingDto {
  return {
    measuredAt: toIsoString(record.measured_at) ?? '',
    receivedAt: toIsoString(record.received_at) ?? '',
    timeSource: record.time_source,
    floodDepthCm: record.flood_depth_cm,
    rainMm: record.rain_mm ?? null,
    rainRateMmH: record.rain_rate_mm_h ?? null,
    rainMm1h: record.rain_mm_1h ?? null,
    tideCm: record.tide_cm,
    temperatureC: record.temperature_c,
    humidityPct: record.humidity_pct,
    lightLux: record.light_lux,
    batteryPct: record.battery_pct,
    rssiDbm: record.rssi_dbm,
    predictedDepthCm: record.predicted_depth_cm,
    forecastMinutes: record.forecast_minutes,
    modelVersion: record.model_version,
    source: record.source,
    extra: record.extra ?? {},
  };
}
