import type { Station } from '@/types/Station';

import { isStationDataFresh } from './isStationDataFresh';

/**
 * Các bộ lọc trạm dùng chung cho Bản đồ và Danh sách trạm:
 *   all      = tất cả
 *   flooding = đang có dữ liệu mới VÀ ở mức Cảnh báo trở lên
 *   followed = trạm mình đang theo dõi
 *   offline  = trạm mất kết nối hoặc chưa có dữ liệu
 */
export type StationFilter = 'all' | 'flooding' | 'followed' | 'offline';

export const stationFilterLabels: Record<StationFilter, string> = {
  all: 'Tất cả',
  flooding: 'Đang ngập',
  followed: 'Đang theo dõi',
  offline: 'Mất kết nối',
};

export function filterStations(stations: Station[], filter: StationFilter, followedIds: string[]): Station[] {
  switch (filter) {
    case 'flooding':
      return stations.filter(
        (s) => isStationDataFresh(s) && ['warning', 'danger', 'critical'].includes(s.floodLevel),
      );
    case 'followed':
      return stations.filter((s) => followedIds.includes(s.nodeId));
    case 'offline':
      return stations.filter((s) => !isStationDataFresh(s));
    default:
      return stations;
  }
}
