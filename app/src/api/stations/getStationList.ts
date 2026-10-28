import type { Station } from '@/types/Station';

import { toStation } from '../mappers/toStation';
import { requestJson } from '../requestJson';

/**
 * LẤY DANH SÁCH TRẠM + TÌNH TRẠNG MỚI NHẤT — GET /api/v1/stations.
 * Một lần gọi có đủ: vị trí, ngưỡng, lần đo cuối (ngập, mưa, triều...), mức ngập, kết nối,
 * bán kính vùng ảnh hưởng, công thức dự đoán node đang dùng.
 */
export async function getStationList(): Promise<Station[]> {
  const raw = await requestJson('GET', '/api/v1/stations');
  const list: unknown[] = Array.isArray(raw?.stations) ? raw.stations : [];
  return list.map(toStation).filter((s): s is Station => s !== null);
}
