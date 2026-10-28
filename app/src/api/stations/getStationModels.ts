import type { StationModel } from '@/types/StationModel';

import { toStationModel } from '../mappers/toStationModel';
import { requestJson } from '../requestJson';

/**
 * LẤY MỌI PHIÊN BẢN CÔNG THỨC của 1 trạm — GET /api/v1/stations/:nodeId/models.
 * Trả về từ cũ (v1 = công thức chung) đến mới (công thức node tự học).
 */
export async function getStationModels(nodeId: string): Promise<StationModel[]> {
  const raw = await requestJson('GET', `/api/v1/stations/${encodeURIComponent(nodeId)}/models`);
  const list: unknown[] = Array.isArray(raw?.models) ? raw.models : [];
  return list.map(toStationModel).filter((m): m is StationModel => m !== null);
}
