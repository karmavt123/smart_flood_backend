import { ROUTE_UNRELIABLE_STATION_RANGE_M } from '@/config/appConfig';
import type { LatLng } from '@/types/LatLng';
import type { Station } from '@/types/Station';

import { distanceToRouteInMeters } from './distanceToRouteInMeters';
import { isStationDataFresh } from './isStationDataFresh';

/**
 * TÌM CÁC TRẠM GẦN TUYẾN NHƯNG DỮ LIỆU KHÔNG ĐÁNG TIN (mất kết nối / chưa có dữ liệu).
 * Máy chủ không biết khu vực quanh các trạm này đang ngập hay không, nên app phải báo
 * "Chưa đủ dữ liệu đánh giá" chứ không được kết luận tuyến an toàn (FR-14).
 */
export function findUnreliableStationsNearRoute(stations: Station[], route: LatLng[]): Station[] {
  return stations.filter((station) => {
    if (isStationDataFresh(station)) return false;
    if (station.latitude === null || station.longitude === null) return false;
    const distance = distanceToRouteInMeters({ latitude: station.latitude, longitude: station.longitude }, route);
    return distance <= ROUTE_UNRELIABLE_STATION_RANGE_M;
  });
}
