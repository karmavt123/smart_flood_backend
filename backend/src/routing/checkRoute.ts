import { worseFloodLevel } from '../domain/compareFloodLevels.js';
import { distanceInMeters } from '../geo/distanceInMeters.js';
import { loadStations } from '../services/loadStations.js';
import type { FloodLevel } from '../types/FloodLevel.js';
import type { LatLng } from '../types/LatLng.js';
import type { RouteCheckResult, RouteStats } from '../types/RouteCheckResult.js';
import { type DrivingRoute, fetchOsrmRoutes } from './fetchOsrmRoutes.js';
import { findActiveFloodZones } from './findActiveFloodZones.js';
import { findFloodZonesOnPath } from './findFloodZonesOnPath.js';
import { formatDistanceLabel, formatDurationLabel } from './formatRouteLabels.js';
import { makeDetourWaypoints } from './makeDetourWaypoints.js';

function statsOf(route: DrivingRoute | null, riskLevel: FloodLevel): RouteStats {
  return {
    distanceLabel: route ? formatDistanceLabel(route.distanceM) : null,
    durationLabel: route && Number.isFinite(route.durationSec) ? formatDurationLabel(route.durationSec) : null,
    riskLevel,
  };
}

/**
 * KIỂM TRA TUYẾN ĐƯỜNG A → B có đi qua vùng ngập không, và tìm tuyến tránh nếu có. Cách làm:
 *   1. Lấy các vùng ngập đang có hiệu lực (node dữ liệu mới, từ mức Cảnh báo).
 *   2. Hỏi OSRM tuyến ngắn nhất + tối đa 3 tuyến khác (1 lần gọi).
 *   3. Tuyến ngắn nhất đi qua vùng ngập → chọn tuyến khác không đi qua vùng nào.
 *   4. Vẫn không có → thử đi vòng sang 2 bên vùng ngập đầu tiên (thêm 2 lần gọi).
 * OSRM lỗi thì tạm dùng đường thẳng A→B để ước lượng (routeEngineOk = false).
 */
export async function checkRoute(start: LatLng, end: LatLng): Promise<RouteCheckResult> {
  const zones = findActiveFloodZones(await loadStations());
  const insideAnyZone = (point: LatLng) =>
    zones.some((zone) => distanceInMeters(point, { latitude: zone.station.latitude!, longitude: zone.station.longitude! }) <= zone.radiusM);
  const endpointBlocked = insideAnyZone(start) || insideAnyZone(end);

  let routes: DrivingRoute[];
  let routeEngineOk = true;
  try {
    routes = await fetchOsrmRoutes([start, end], true);
  } catch (error) {
    console.warn(`[route] OSRM lỗi, dùng đường thẳng: ${(error as Error).message}`);
    routeEngineOk = false;
    routes = [{ path: [start, end], distanceM: distanceInMeters(start, end), durationSec: Number.NaN }];
  }

  const direct = routes[0]!;
  const floodPoints = findFloodZonesOnPath(direct.path, zones);
  const riskLevel = floodPoints.reduce<FloodLevel>((worst, p) => worseFloodLevel(worst, p.level), 'normal');
  const isClear = (route: DrivingRoute) => findFloodZonesOnPath(route.path, zones).length === 0;

  let suggested: DrivingRoute | null = null;
  if (floodPoints.length > 0 && routeEngineOk && !endpointBlocked) {
    suggested = routes.slice(1).find(isClear) ?? null;
    if (!suggested) {
      for (const waypoint of makeDetourWaypoints(start, end, floodPoints[0]!)) {
        try {
          const [detour] = await fetchOsrmRoutes([start, waypoint, end], false);
          if (detour && isClear(detour) && (!suggested || detour.distanceM < suggested.distanceM)) suggested = detour;
        } catch {
          // Điểm vòng này không tìm được đường → thử điểm còn lại.
        }
      }
    }
  }

  let message: string;
  if (endpointBlocked) message = 'Điểm đi hoặc điểm đến đang nằm trong vùng ngập. Nên cân nhắc chờ nước rút rồi hẵng đi.';
  else if (floodPoints.length === 0) message = 'Tuyến này không đi qua vùng ngập nào đang được ghi nhận.';
  else if (suggested) message = `Tuyến ngắn nhất đi qua ${floodPoints.length} vùng ngập. Đã tìm được tuyến tránh ngập (màu xanh lá).`;
  else message = `Tuyến đi qua ${floodPoints.length} vùng ngập và chưa tìm được tuyến tránh. Nên cân nhắc chờ nước rút.`;
  if (!routeEngineOk) message += ' (Không kết nối được dịch vụ chỉ đường, đang ước lượng bằng đường thẳng.)';

  return {
    message,
    riskLevel,
    safeRouteFound: suggested !== null,
    endpointBlocked,
    routeEngineOk,
    directRoute: direct.path,
    suggestedRoute: suggested?.path ?? [],
    floodPoints,
    directStats: statsOf(direct, riskLevel),
    suggestedStats: statsOf(suggested, 'normal'),
  };
}
