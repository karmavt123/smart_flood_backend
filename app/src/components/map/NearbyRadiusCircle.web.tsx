import { Circle } from 'react-leaflet';

import { appColors } from '@/constants/appColors';
import type { LatLng } from '@/types/LatLng';

/** VÒNG "QUANH BẠN" trên bản đồ WEB (Leaflet) — giống bản điện thoại: vòng nét đứt bán kính 2 km. */
export function NearbyRadiusCircle({ center, radiusM }: { center: LatLng; radiusM: number }) {
  return (
    <Circle
      center={[center.latitude, center.longitude]}
      radius={radiusM}
      pathOptions={{ color: appColors.primary, weight: 2, dashArray: '10 8', fillColor: appColors.primary, fillOpacity: 0.06 }}
      interactive={false}
    />
  );
}
