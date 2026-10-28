import { floodLevelStyles, STALE_STATION_COLOR } from '@/constants/floodLevelStyles';
import type { Station } from '@/types/Station';

import { isStationDataFresh } from './isStationDataFresh';

/**
 * TÍNH "VẺ NGOÀI" CỦA NHÃN TRẠM TRÊN BẢN ĐỒ: màu, ký hiệu, chữ.
 * Dùng chung cho bản đồ điện thoại (StationMarker.tsx) và bản đồ web (StationMarker.web.tsx)
 * để 2 nơi luôn hiển thị giống nhau.
 *  - Trạm có dữ liệu mới: màu + ký hiệu theo mức ngập, ví dụ "◆ 33 cm".
 *  - Trạm mất kết nối: màu xám, ký hiệu ⏸, ghi thêm "· cũ".
 */
export function getStationMarkerLook(station: Station) {
  const fresh = isStationDataFresh(station);
  const levelStyle = floodLevelStyles[station.floodLevel];
  const color = fresh ? levelStyle.color : STALE_STATION_COLOR;
  const symbol = fresh ? levelStyle.symbol : '⏸';
  const value = station.waterLevelCm === null ? '—' : `${station.waterLevelCm.toFixed(0)} cm${fresh ? '' : ' · cũ'}`;
  return { fresh, color, text: `${symbol} ${value}` };
}
