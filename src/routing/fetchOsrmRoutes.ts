import { appConfig } from '../config/appConfig.js';
import type { LatLng } from '../types/LatLng.js';

export interface DrivingRoute {
  path: LatLng[];
  distanceM: number;
  durationSec: number;
}

/**
 * HỎI DỊCH VỤ CHỈ ĐƯỜNG OSRM: đi qua lần lượt các điểm `points` (điểm đi, [điểm trung gian], điểm đến).
 * `withAlternatives` = xin thêm tối đa 3 tuyến khác để chọn tuyến tránh ngập (chỉ 1 lần gọi).
 */
export async function fetchOsrmRoutes(points: LatLng[], withAlternatives: boolean): Promise<DrivingRoute[]> {
  const coordinates = points.map((p) => `${p.longitude},${p.latitude}`).join(';');
  const url =
    `${appConfig.osrmUrl}/route/v1/driving/${coordinates}` +
    `?overview=full&geometries=geojson&alternatives=${withAlternatives ? '3' : 'false'}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'SmartFlood/1.0 (du an khoa hoc ky thuat hoc sinh)' },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`OSRM trả về mã ${response.status}`);
  const data = (await response.json()) as {
    code?: string;
    routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[];
  };
  if (data.code !== 'Ok' || !data.routes?.length) throw new Error(`OSRM không tìm được đường (${data.code ?? 'không rõ'})`);
  return data.routes.map((route) => ({
    path: route.geometry.coordinates.map(([longitude, latitude]) => ({ latitude, longitude })),
    distanceM: route.distance,
    durationSec: route.duration,
  }));
}
