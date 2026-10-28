import { distanceToPathInMeters } from '../geo/distanceToPathInMeters.js';
import type { LatLng } from '../types/LatLng.js';
import type { RouteFloodPoint } from '../types/RouteCheckResult.js';
import type { FloodZone } from './FloodZone.js';

/** Những vùng ngập mà tuyến đường `path` đi xuyên qua (khoảng cách từ node tới tuyến < bán kính vùng). */
export function findFloodZonesOnPath(path: LatLng[], zones: FloodZone[]): RouteFloodPoint[] {
  return zones
    .map((zone) => {
      const position = { latitude: zone.station.latitude!, longitude: zone.station.longitude! };
      return { zone, position, distance: distanceToPathInMeters(position, path) };
    })
    .filter((item) => item.distance <= item.zone.radiusM)
    .map(({ zone, position, distance }) => ({
      nodeId: zone.station.nodeId,
      name: zone.station.name,
      position,
      level: zone.station.floodLevel,
      waterLevelCm: zone.station.latest?.floodDepthCm ?? 0,
      radiusM: zone.radiusM,
      distanceToRouteM: Math.round(distance),
    }));
}
