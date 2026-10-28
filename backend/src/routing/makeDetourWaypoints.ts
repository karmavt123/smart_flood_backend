import { fromLocalMeters, toLocalMeters } from '../geo/toLocalMeters.js';
import type { LatLng } from '../types/LatLng.js';
import type { RouteFloodPoint } from '../types/RouteCheckResult.js';

/** Đi vòng cách mép vùng ngập thêm 250 m. */
const DETOUR_MARGIN_M = 250;

/**
 * TẠO 2 ĐIỂM ĐI VÒNG quanh 1 vùng ngập: lệch sang 2 bên của hướng đi (vuông góc với đường A→B).
 * Sau đó nhờ OSRM tìm đường A → điểm vòng → B; bên nào không đi qua vùng ngập thì chọn.
 */
export function makeDetourWaypoints(start: LatLng, end: LatLng, flood: RouteFloodPoint): LatLng[] {
  const a = toLocalMeters(start, flood.position);
  const b = toLocalMeters(end, flood.position);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const offset = flood.radiusM + DETOUR_MARGIN_M;
  // Vector vuông góc với hướng đi, độ dài = offset.
  const px = (-dy / length) * offset;
  const py = (dx / length) * offset;
  return [fromLocalMeters({ x: px, y: py }, flood.position), fromLocalMeters({ x: -px, y: -py }, flood.position)];
}
