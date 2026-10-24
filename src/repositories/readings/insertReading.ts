import { db } from '../../db/sharedDatabase.js';
import type { ParsedNodeMessage } from '../../ingest/ParsedNodeMessage.js';

/**
 * LƯU 1 LẦN ĐO. Trả về true nếu lưu mới, false nếu đã có lần đo cùng node + cùng thời điểm
 * (MQTT có thể gửi lại 1 tin 2 lần — không lưu trùng).
 */
export async function insertReading(
  message: ParsedNodeMessage,
  source: 'mqtt' | 'import' | 'admin-test',
  receivedAt: Date,
): Promise<boolean> {
  const rows = await db().query<{ inserted: number }>(
    `INSERT INTO readings (
       node_id, measured_at, received_at, time_source,
       flood_depth_cm, rain_mm_1h, tide_cm,
       temperature_c, humidity_pct, light_lux, battery_pct, rssi_dbm,
       predicted_depth_cm, forecast_minutes, model_version, source, extra
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::jsonb)
     ON CONFLICT (node_id, measured_at) DO NOTHING
     RETURNING 1 AS inserted`,
    [
      message.nodeId,
      message.measuredAt,
      receivedAt,
      message.timeSource,
      message.floodDepthCm,
      message.rainMm1h,
      message.tideCm,
      message.temperatureC,
      message.humidityPct,
      message.lightLux,
      message.batteryPct,
      message.rssiDbm,
      message.prediction?.depthCm ?? null,
      message.prediction?.horizonMinutes ?? null,
      message.model?.version ?? null,
      source,
      JSON.stringify(message.extra),
    ],
  );
  return rows.length > 0;
}
