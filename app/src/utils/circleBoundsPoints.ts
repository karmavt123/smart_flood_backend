import type { LatLng } from '@/types/LatLng';

/**
 * 4 ĐIỂM Ở MÉP 1 VÒNG TRÒN (bắc, nam, đông, tây) — đưa vào fitToCoordinates để bản đồ
 * thu/phóng vừa khít vòng tròn đó (vd vòng 2 km "Quanh bạn").
 */
export function circleBoundsPoints(center: LatLng, radiusM: number): LatLng[] {
  const dLat = radiusM / 110540;
  const dLng = radiusM / (111320 * Math.cos((center.latitude * Math.PI) / 180));
  return [
    { latitude: center.latitude + dLat, longitude: center.longitude },
    { latitude: center.latitude - dLat, longitude: center.longitude },
    { latitude: center.latitude, longitude: center.longitude + dLng },
    { latitude: center.latitude, longitude: center.longitude - dLng },
  ];
}
