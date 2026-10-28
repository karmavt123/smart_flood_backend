import type { LatLng } from '@/types/LatLng';
import type { NearbyFlooding } from '@/types/NearbyFlooding';

import { toNearbyFlooding } from '../mappers/toNearbyFlooding';
import { requestJson } from '../requestJson';

/**
 * TÌNH HÌNH NGẬP QUANH 1 VỊ TRÍ — GET /api/v1/nearby?lat=&lng=&radius=.
 * Máy chủ trả: các trạm trong bán kính, kết luận (có ngập / chưa ghi nhận / chưa đủ dữ liệu),
 * và các đoạn đường bị ngập để tô màu.
 */
export async function getNearbyFlooding(center: LatLng, radiusM: number): Promise<NearbyFlooding> {
  const raw = await requestJson(
    'GET',
    `/api/v1/nearby?lat=${center.latitude.toFixed(6)}&lng=${center.longitude.toFixed(6)}&radius=${Math.round(radiusM)}`,
  );
  return toNearbyFlooding(raw);
}
