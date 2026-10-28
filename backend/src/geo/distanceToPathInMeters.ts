import type { LatLng } from '../types/LatLng.js';
import { toLocalMeters } from './toLocalMeters.js';

/**
 * Khoảng cách ngắn nhất (mét) từ 1 điểm tới 1 đường gấp khúc (vd tuyến đường đi).
 * Cách làm: lấy điểm làm gốc tọa độ, với từng đoạn thẳng tìm điểm gần nhất trên đoạn đó.
 */
export function distanceToPathInMeters(point: LatLng, path: LatLng[]): number {
  if (path.length === 0) return Infinity;
  let best = Infinity;
  for (let i = 0; i < path.length; i += 1) {
    const a = toLocalMeters(path[i]!, point);
    const b = toLocalMeters(path[Math.min(i + 1, path.length - 1)]!, point);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    // t = vị trí điểm gần nhất trên đoạn a→b (0 = tại a, 1 = tại b)
    const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / lengthSquared));
    const closestX = a.x + t * dx;
    const closestY = a.y + t * dy;
    best = Math.min(best, Math.hypot(closestX, closestY));
  }
  return best;
}
