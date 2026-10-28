import { Circle } from 'react-native-maps';

import { floodLevelStyles } from '@/constants/floodLevelStyles';
import type { Station } from '@/types/Station';
import { isStationDataFresh } from '@/utils/isStationDataFresh';

/**
 * VÙNG ẢNH HƯỞNG NGẬP quanh trạm (FR-04) — vòng tròn tô màu theo mức ngập.
 * Bán kính do máy chủ tính: Cảnh báo 100 m, Nguy hiểm 200 m, Rất nguy hiểm 300 m.
 * `faint` = trạm đã được tô màu đường ngập → vòng vẽ nhạt hơn (vẫn giữ để nhìn từ xa thấy chỗ ngập).
 *
 * KHÔNG vẽ khi:
 *  - máy chủ trả bán kính 0 (trạm đang An toàn);
 *  - trạm mất kết nối (dữ liệu cũ) — tránh vẽ vùng ngập của nhiều ngày trước như đang ngập.
 * Lưu ý: đây là vùng ĐÁNH GIÁ, không phải ranh giới ngập đo được.
 */
export function FloodZoneCircle({ station, faint = false }: { station: Station; faint?: boolean }) {
  if (station.latitude === null || station.longitude === null) return null;
  if (station.floodRadiusM <= 0 || !isStationDataFresh(station)) return null;
  const color = floodLevelStyles[station.floodLevel].color;
  return (
    <Circle
      center={{ latitude: station.latitude, longitude: station.longitude }}
      radius={station.floodRadiusM}
      strokeColor={color}
      strokeWidth={faint ? 1 : 2}
      fillColor={`${color}${faint ? '1F' : '33'}`}
    />
  );
}
