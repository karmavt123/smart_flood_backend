import { worseFloodLevel } from '../domain/compareFloodLevels.js';
import { isFloodingLevel } from '../domain/isFloodingLevel.js';
import { distanceInMeters } from '../geo/distanceInMeters.js';
import { getFloodedRoadsForStation } from '../roads/getFloodedRoadsForStation.js';
import { loadStations } from '../services/loadStations.js';
import type { FloodLevel } from '../types/FloodLevel.js';
import type { LatLng } from '../types/LatLng.js';
import type { NearbyResult } from '../types/NearbyResult.js';

/**
 * TÌNH HÌNH NGẬP QUANH 1 VỊ TRÍ (màn "Quanh bạn" của app):
 * các trạm trong bán kính, kết luận có ngập / không ngập / chưa đủ dữ liệu, và các đoạn đường bị ngập.
 */
export async function buildNearbyResult(center: LatLng, radiusM: number): Promise<NearbyResult> {
  const stations = (await loadStations())
    .filter((s) => s.latitude !== null && s.longitude !== null)
    .map((s) => ({ ...s, distanceM: Math.round(distanceInMeters(center, { latitude: s.latitude!, longitude: s.longitude! })) }))
    .sort((a, b) => a.distanceM - b.distanceM);

  const inside = stations.filter((s) => s.distanceM <= radiusM);
  // Node đang ngập mà vùng ảnh hưởng chạm vào vòng tròn cũng tính (node ở ngay mép ngoài).
  const flooding = stations.filter(
    (s) => s.isFloodInfoUsable && isFloodingLevel(s.floodLevel) && s.distanceM <= radiusM + s.influenceRadiusM,
  );
  const online = inside.filter((s) => s.connectionState === 'online').length;

  const roadResults = await Promise.all(flooding.map((s) => getFloodedRoadsForStation(s)));
  const failed = roadResults.filter((r) => r === null).length;
  const worstLevel = flooding.reduce<FloodLevel>((worst, s) => worseFloodLevel(worst, s.floodLevel), 'normal');

  return {
    center,
    radiusM,
    generatedAt: new Date().toISOString(),
    state: flooding.length > 0 ? 'flooding' : online > 0 ? 'clear' : 'insufficient',
    worstLevel: flooding.length > 0 ? worstLevel : online > 0 ? 'normal' : 'unknown',
    counts: {
      stationsInside: inside.length,
      online,
      flooding: flooding.length,
      stale: inside.filter((s) => !s.isFloodInfoUsable).length,
    },
    stations: inside,
    floodedRoads: roadResults.flatMap((r) => r ?? []),
    roadsStatus: flooding.length === 0 ? 'none' : failed === 0 ? 'ok' : failed < flooding.length ? 'partial' : 'unavailable',
  };
}
