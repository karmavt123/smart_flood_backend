import { Circle } from 'react-leaflet';

import { floodLevelStyles } from '@/constants/floodLevelStyles';
import type { Station } from '@/types/Station';
import { isStationDataFresh } from '@/utils/isStationDataFresh';

/**
 * VÙNG ẢNH HƯỞNG NGẬP trên bản đồ WEB (Leaflet) — cùng quy tắc với bản điện thoại (FloodZoneCircle.tsx):
 * chỉ vẽ khi trạm còn dữ liệu mới và máy chủ trả bán kính > 0; `faint` = đã tô màu đường nên vẽ nhạt hơn.
 */
export function FloodZoneCircle({ station, faint = false }: { station: Station; faint?: boolean }) {
  if (station.latitude === null || station.longitude === null) return null;
  if (station.floodRadiusM <= 0 || !isStationDataFresh(station)) return null;
  const color = floodLevelStyles[station.floodLevel].color;
  return (
    <Circle
      center={[station.latitude, station.longitude]}
      radius={station.floodRadiusM}
      pathOptions={{ color, weight: faint ? 1 : 2, fillColor: color, fillOpacity: faint ? 0.12 : 0.2 }}
      interactive={false}
    />
  );
}
