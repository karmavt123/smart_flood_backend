import type { LatLng } from '@/types/LatLng';

/**
 * KHOẢNG CÁCH NGẮN NHẤT (mét) từ một điểm tới một tuyến đường (dãy điểm nối nhau).
 * Cách làm: quy đổi tọa độ ra mét quanh điểm cần đo (đủ chính xác trong phạm vi vài km),
 * rồi tính khoảng cách tới từng đoạn thẳng và lấy giá trị nhỏ nhất.
 */
export function distanceToRouteInMeters(point: LatLng, route: LatLng[]): number {
  if (route.length === 0) return Infinity;
  const METERS_PER_DEGREE = 111320;
  const cosLat = Math.cos((point.latitude * Math.PI) / 180);
  const toXY = (p: LatLng) => ({
    x: (p.longitude - point.longitude) * METERS_PER_DEGREE * cosLat,
    y: (p.latitude - point.latitude) * METERS_PER_DEGREE,
  });

  if (route.length === 1) {
    const only = toXY(route[0]);
    return Math.hypot(only.x, only.y);
  }

  let best = Infinity;
  for (let i = 0; i < route.length - 1; i++) {
    const a = toXY(route[i]);
    const b = toXY(route[i + 1]);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    // t = vị trí hình chiếu của điểm (gốc tọa độ) lên đoạn AB, kẹp trong [0, 1]
    const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / lengthSquared));
    best = Math.min(best, Math.hypot(a.x + t * dx, a.y + t * dy));
  }
  return best;
}
