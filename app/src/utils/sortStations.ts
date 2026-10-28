import type { LatLng } from '@/types/LatLng';
import type { Station } from '@/types/Station';

import { distanceInMeters } from './distanceInMeters';
import { isStationDataFresh } from './isStationDataFresh';

/** Cách sắp xếp danh sách trạm (FR-05). */
export type StationSort = 'name' | 'waterLevel' | 'lastSeen' | 'distance';

export const stationSortLabels: Record<StationSort, string> = {
  name: 'Tên A→Z',
  waterLevel: 'Ngập sâu trước',
  lastSeen: 'Cập nhật mới nhất',
  distance: 'Gần tôi nhất',
};

/** Trả về danh sách MỚI đã sắp xếp (không sửa danh sách gốc). */
export function sortStations(stations: Station[], sort: StationSort, myPosition: LatLng | null): Station[] {
  const list = [...stations];
  switch (sort) {
    case 'waterLevel': {
      // Trạm có số đo mới xếp trước; trạm mất kết nối xếp sau (số của nó là số cũ); chưa có dữ liệu xếp cuối.
      const group = (s: Station) => (s.waterLevelCm === null ? 2 : isStationDataFresh(s) ? 0 : 1);
      return list.sort((a, b) => group(a) - group(b) || (b.waterLevelCm ?? 0) - (a.waterLevelCm ?? 0));
    }
    case 'lastSeen': {
      const seenMs = (s: Station) => (s.lastSeenAt ? Date.parse(s.lastSeenAt) || 0 : 0);
      return list.sort((a, b) => seenMs(b) - seenMs(a));
    }
    case 'distance': {
      if (!myPosition) return list;
      // Trạm chưa có tọa độ xếp cuối (dùng số rất lớn thay vì Infinity để phép trừ không ra NaN).
      const distance = (s: Station) =>
        s.latitude === null || s.longitude === null
          ? Number.MAX_SAFE_INTEGER
          : distanceInMeters(myPosition, { latitude: s.latitude, longitude: s.longitude });
      return list.sort((a, b) => distance(a) - distance(b));
    }
    default:
      return list.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }
}
