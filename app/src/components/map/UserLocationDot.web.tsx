import { CircleMarker } from 'react-leaflet';

import type { LatLng } from '@/types/LatLng';

/**
 * CHẤM XANH "VỊ TRÍ CỦA TÔI" trên bản đồ WEB.
 * (Trên điện thoại, react-native-maps tự vẽ chấm này nên không cần file tương ứng.)
 */
export function UserLocationDot({ position }: { position: LatLng }) {
  return (
    <CircleMarker
      center={[position.latitude, position.longitude]}
      radius={8}
      pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#2563EB', fillOpacity: 1 }}
      interactive={false}
    />
  );
}
