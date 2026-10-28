import { distanceInMeters } from '@/utils/distanceInMeters';

import { buildDemoStationList } from './demoStations';

const FLOODING = ['warning', 'danger', 'critical'];
const ORDER = ['normal', 'warning', 'danger', 'critical'];

/**
 * "QUANH BẠN" MẪU cho chế độ DEMO, đúng định dạng GET /api/v1/nearby — cách tính giống backend.
 * Chế độ demo không có mạng nên KHÔNG có hình dạng đường (roadsStatus = "unavailable"):
 * app sẽ vẽ vòng tròn vùng ảnh hưởng thay cho tô màu đường.
 */
export function buildDemoNearby(lat: number, lng: number, radiusM: number) {
  const center = { latitude: lat, longitude: lng };
  const stations = buildDemoStationList()
    .map((s) => ({ ...s, distanceM: Math.round(distanceInMeters(center, { latitude: s.latitude, longitude: s.longitude })) }))
    .sort((a, b) => a.distanceM - b.distanceM);
  const inside = stations.filter((s) => s.distanceM <= radiusM);
  const flooding = stations.filter(
    (s) => s.isFloodInfoUsable && FLOODING.includes(s.floodLevel) && s.distanceM <= radiusM + s.influenceRadiusM,
  );
  const online = inside.filter((s) => s.connectionState === 'online').length;
  const worst = flooding.reduce((w, s) => (ORDER.indexOf(s.floodLevel) > ORDER.indexOf(w) ? s.floodLevel : w), 'normal');

  return {
    center,
    radiusM,
    generatedAt: new Date().toISOString(),
    state: flooding.length > 0 ? 'flooding' : online > 0 ? 'clear' : 'insufficient',
    worstLevel: flooding.length > 0 ? worst : online > 0 ? 'normal' : 'unknown',
    counts: { stationsInside: inside.length, online, flooding: flooding.length, stale: inside.filter((s) => !s.isFloodInfoUsable).length },
    stations: inside,
    floodedRoads: [],
    roadsStatus: flooding.length > 0 ? 'unavailable' : 'none',
  };
}
