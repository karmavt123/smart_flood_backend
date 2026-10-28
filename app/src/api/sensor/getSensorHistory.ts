import type { SensorReading } from '@/types/SensorReading';

import { toSensorReading } from '../mappers/toSensorReading';
import { requestJson } from '../requestJson';

/** Lấy tối đa chừng này lần đo mỗi lần (máy chủ cho phép tới 5000). */
export const HISTORY_MAX_POINTS = 5000;

/**
 * LẤY LỊCH SỬ ĐO của một trạm (FR-07) — GET /api/v1/stations/:nodeId/readings?hours=&limit=.
 * Máy chủ trả các lần đo MỚI NHẤT trong khoảng thời gian, xếp từ cũ đến mới.
 */
export async function getSensorHistory(nodeId: string, hours: number): Promise<SensorReading[]> {
  const raw = await requestJson(
    'GET',
    `/api/v1/stations/${encodeURIComponent(nodeId)}/readings?hours=${hours}&limit=${HISTORY_MAX_POINTS}`,
  );
  const list: unknown[] = Array.isArray(raw?.readings) ? raw.readings : [];
  return list
    .map((r) => toSensorReading(r, nodeId))
    .filter((r): r is SensorReading => r !== null)
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
}
