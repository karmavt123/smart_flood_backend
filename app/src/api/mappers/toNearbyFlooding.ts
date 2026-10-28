import type { FloodedRoad } from '@/types/FloodedRoad';
import type { NearbyFlooding } from '@/types/NearbyFlooding';
import type { Station } from '@/types/Station';
import { toNumberOrNull } from '@/utils/toNumberOrNull';

import { toFloodLevel } from './toFloodLevel';
import { toLatLngList } from './toLatLngList';
import { toStation } from './toStation';

const STATES = ['flooding', 'clear', 'insufficient'] as const;
const ROAD_STATUSES = ['ok', 'partial', 'unavailable', 'none'] as const;

/** Chuyển JSON của GET /api/v1/nearby sang NearbyFlooding. */
export function toNearbyFlooding(raw: any): NearbyFlooding {
  const stations = (Array.isArray(raw?.stations) ? raw.stations : [])
    .map((s: any) => ({ station: toStation(s), distanceM: toNumberOrNull(s?.distanceM) ?? 0 }))
    .filter((s: { station: Station | null }): s is { station: Station; distanceM: number } => s.station !== null);
  const floodedRoads: FloodedRoad[] = (Array.isArray(raw?.floodedRoads) ? raw.floodedRoads : [])
    .map((r: any) => ({
      nodeId: String(r?.nodeId ?? ''),
      level: toFloodLevel(r?.level),
      roadName: typeof r?.roadName === 'string' ? r.roadName : null,
      path: toLatLngList(r?.path),
    }))
    .filter((r: FloodedRoad) => r.path.length >= 2);

  return {
    center: { latitude: toNumberOrNull(raw?.center?.latitude) ?? 0, longitude: toNumberOrNull(raw?.center?.longitude) ?? 0 },
    radiusM: toNumberOrNull(raw?.radiusM) ?? 2000,
    state: STATES.includes(raw?.state) ? raw.state : 'insufficient',
    worstLevel: toFloodLevel(raw?.worstLevel),
    counts: {
      stationsInside: toNumberOrNull(raw?.counts?.stationsInside) ?? stations.length,
      online: toNumberOrNull(raw?.counts?.online) ?? 0,
      flooding: toNumberOrNull(raw?.counts?.flooding) ?? 0,
      stale: toNumberOrNull(raw?.counts?.stale) ?? 0,
    },
    stations,
    floodedRoads,
    roadsStatus: ROAD_STATUSES.includes(raw?.roadsStatus) ? raw.roadsStatus : 'unavailable',
  };
}
