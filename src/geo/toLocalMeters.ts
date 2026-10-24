import type { LatLng } from '../types/LatLng.js';

const METERS_PER_DEGREE_LAT = 110540;
const METERS_PER_DEGREE_LNG_AT_EQUATOR = 111320;

/**
 * Đổi tọa độ sang (x, y) tính bằng MÉT so với 1 điểm gốc — coi mặt đất là phẳng.
 * Đủ chính xác trong vài km (phạm vi 1 thành phố), giúp tính khoảng cách tới đoạn thẳng dễ hơn.
 */
export function toLocalMeters(point: LatLng, origin: LatLng): { x: number; y: number } {
  const cosLat = Math.cos((origin.latitude * Math.PI) / 180);
  return {
    x: (point.longitude - origin.longitude) * METERS_PER_DEGREE_LNG_AT_EQUATOR * cosLat,
    y: (point.latitude - origin.latitude) * METERS_PER_DEGREE_LAT,
  };
}

/** Đổi ngược (x, y) mét so với điểm gốc về tọa độ vĩ độ, kinh độ. */
export function fromLocalMeters(local: { x: number; y: number }, origin: LatLng): LatLng {
  const cosLat = Math.cos((origin.latitude * Math.PI) / 180);
  return {
    latitude: origin.latitude + local.y / METERS_PER_DEGREE_LAT,
    longitude: origin.longitude + local.x / (METERS_PER_DEGREE_LNG_AT_EQUATOR * cosLat),
  };
}
