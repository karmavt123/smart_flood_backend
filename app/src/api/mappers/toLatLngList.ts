import type { LatLng } from '@/types/LatLng';
import { toNumberOrNull } from '@/utils/toNumberOrNull';

/** Đọc 1 dãy tọa độ {latitude, longitude} trong JSON máy chủ; điểm nào thiếu số thì bỏ. */
export function toLatLngList(list: any): LatLng[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((p: any) => ({ latitude: toNumberOrNull(p?.latitude), longitude: toNumberOrNull(p?.longitude) }))
    .filter((p): p is LatLng => p.latitude !== null && p.longitude !== null);
}
