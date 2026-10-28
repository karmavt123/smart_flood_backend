import type { LatLng } from '@/types/LatLng';
import { distanceToRouteInMeters } from '@/utils/distanceToRouteInMeters';

import { buildDemoStationList } from './demoStations';

const SAFETY_BUFFER_M = 50;
const FLOODING = ['warning', 'danger', 'critical'];
const ORDER = ['normal', 'warning', 'danger', 'critical'];

/** Các trạm ngập (còn dữ liệu mới) mà tuyến đi xuyên vùng ảnh hưởng — cách tính giống backend. */
function floodPointsNear(route: LatLng[]) {
  return buildDemoStationList()
    .filter((s) => s.isFloodInfoUsable && FLOODING.includes(s.floodLevel))
    .map((s) => {
      const position = { latitude: s.latitude, longitude: s.longitude };
      const radiusM = s.influenceRadiusM + SAFETY_BUFFER_M;
      return { s, position, radiusM, distance: distanceToRouteInMeters(position, route) };
    })
    .filter((x) => x.distance <= x.radiusM)
    .map(({ s, position, radiusM, distance }) => ({
      nodeId: s.nodeId,
      name: s.name,
      position,
      level: s.floodLevel,
      waterLevelCm: s.latest?.floodDepthCm ?? 0,
      radiusM,
      distanceToRouteM: Math.round(distance),
    }));
}

const worstLevel = (points: { level: string }[]) =>
  points.reduce((w, p) => (ORDER.indexOf(p.level) > ORDER.indexOf(w) ? p.level : w), 'normal');

/**
 * KIỂM TRA TUYẾN MẪU cho chế độ DEMO, đúng định dạng POST /api/v1/route/check.
 * Không gọi OSRM: tuyến chính là đường thẳng; nếu đi qua vùng ngập thì tạo tuyến vòng sang một bên.
 */
export function buildDemoRouteCheck(start: LatLng, end: LatLng) {
  const direct = [start, end];
  const directFlood = floodPointsNear(direct);

  let suggested: LatLng[] = [];
  if (directFlood.length) {
    const p = directFlood[0]!;
    const mPerLat = 110540;
    const mPerLng = 111320 * Math.cos((p.position.latitude * Math.PI) / 180);
    const dx = (end.longitude - start.longitude) * mPerLng;
    const dy = (end.latitude - start.latitude) * mPerLat;
    const len = Math.hypot(dx, dy) || 1;
    const offset = p.radiusM + 300;
    const detour = {
      latitude: p.position.latitude + ((dx / len) * offset) / mPerLat,
      longitude: p.position.longitude + ((-dy / len) * offset) / mPerLng,
    };
    const candidate = [start, detour, end];
    if (floodPointsNear(candidate).length === 0) suggested = candidate;
  }
  const riskLevel = worstLevel(directFlood);

  let message = 'Tuyến này không đi qua vùng ngập nào đang được ghi nhận.';
  if (directFlood.length) {
    message = suggested.length
      ? `Tuyến ngắn nhất đi qua ${directFlood.length} vùng ngập. Đã tìm được tuyến tránh ngập (màu xanh lá).`
      : `Tuyến đi qua ${directFlood.length} vùng ngập và chưa tìm được tuyến tránh. Nên cân nhắc chờ nước rút.`;
  }

  return {
    message: `${message} (Chế độ demo: tuyến vẽ bằng đường thẳng.)`,
    riskLevel,
    safeRouteFound: suggested.length > 0,
    endpointBlocked: false,
    routeEngineOk: true,
    directRoute: direct,
    suggestedRoute: suggested,
    floodPoints: directFlood,
    directStats: { distanceLabel: null, durationLabel: null, riskLevel },
    suggestedStats: { distanceLabel: null, durationLabel: null, riskLevel: 'normal' },
  };
}
