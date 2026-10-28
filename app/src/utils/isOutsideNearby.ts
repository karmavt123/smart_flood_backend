import type { LatLng } from '@/types/LatLng';
import type { Station } from '@/types/Station';

import { distanceInMeters } from './distanceInMeters';

/** Trạm có nằm NGOÀI vòng "Quanh bạn" không (để vẽ mờ đi). Chưa có tâm vòng hoặc trạm chưa có tọa độ → false. */
export function isOutsideNearby(station: Station, center: LatLng | null, radiusM: number): boolean {
  if (!center || station.latitude === null || station.longitude === null) return false;
  return distanceInMeters(center, { latitude: station.latitude, longitude: station.longitude }) > radiusM;
}
