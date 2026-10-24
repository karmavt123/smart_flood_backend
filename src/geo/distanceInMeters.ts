import type { LatLng } from '../types/LatLng.js';

const EARTH_RADIUS_M = 6371000;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Khoảng cách theo đường chim bay giữa 2 điểm (mét), công thức haversine. */
export function distanceInMeters(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}
