import type { LatLng } from '@/types/LatLng';
import type { RouteCheckResult } from '@/types/RouteCheckResult';

import { toRouteCheckResult } from '../mappers/toRouteCheckResult';
import { requestJson } from '../requestJson';

/**
 * KIỂM TRA TUYẾN ĐƯỜNG CÓ NGUY CƠ NGẬP (FR-14) — POST /api/v1/route/check.
 * Máy chủ lấy tuyến từ dịch vụ chỉ đường OSRM, xem tuyến có đi xuyên vùng ảnh hưởng của trạm
 * đang ngập không, và thử tìm tuyến khác tránh vùng ngập.
 */
export async function checkRouteFloodRisk(start: LatLng, end: LatLng): Promise<RouteCheckResult> {
  const raw = await requestJson('POST', '/api/v1/route/check', { start, end });
  return toRouteCheckResult(raw);
}
