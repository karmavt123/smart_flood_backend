import { Circle } from 'react-native-maps';

import { appColors } from '@/constants/appColors';
import type { LatLng } from '@/types/LatLng';

/**
 * VÒNG "QUANH BẠN" trên bản đồ điện thoại: vòng tròn bán kính 2 km quanh vị trí đang xem.
 * Đường ngập trong vòng này được tô màu. Bản web nằm ở NearbyRadiusCircle.web.tsx.
 */
export function NearbyRadiusCircle({ center, radiusM }: { center: LatLng; radiusM: number }) {
  return (
    <Circle
      center={center}
      radius={radiusM}
      strokeColor={appColors.primary}
      strokeWidth={2}
      lineDashPattern={[10, 8]}
      fillColor={`${appColors.primary}0F`}
    />
  );
}
