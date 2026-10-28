import L from 'leaflet';
import { useMemo } from 'react';
import { Marker } from 'react-leaflet';

import type { Station } from '@/types/Station';
import { getStationMarkerLook } from '@/utils/getStationMarkerLook';

/**
 * ĐIỂM TRẠM TRÊN BẢN ĐỒ WEB (Leaflet) — giống hệt bản điện thoại (StationMarker.tsx):
 * nhãn màu theo mức ngập + ký hiệu + độ ngập, trạm mất kết nối màu xám, trạm đang chọn to hơn,
 * trạm ngoài vòng "Quanh bạn" (dimmed) mờ đi.
 * Leaflet vẽ nhãn bằng HTML nên phần giao diện viết dạng chuỗi HTML ở dưới.
 */
export function StationMarker({
  station,
  selected,
  dimmed,
  onPress,
}: {
  station: Station;
  selected: boolean;
  dimmed: boolean;
  onPress: () => void;
}) {
  const look = getStationMarkerLook(station);

  const icon = useMemo(() => {
    const border = selected ? '#0F172A' : '#ffffff';
    const padding = selected ? '6px 11px' : '4px 8px';
    const fontSize = selected ? 15 : 12;
    const html = `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);opacity:${dimmed && !selected ? 0.45 : 1};">
        <div style="background:${look.color};color:#fff;font:900 ${fontSize}px system-ui,sans-serif;white-space:nowrap;
                    padding:${padding};border-radius:12px;border:2px solid ${border};box-shadow:0 1px 4px rgba(0,0,0,.35);cursor:pointer;">
          ${look.text}
        </div>
        <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${look.color};"></div>
      </div>`;
    // className rỗng: Leaflet không vẽ khung trắng mặc định. iconSize undefined: nhãn tự co giãn theo chữ.
    return L.divIcon({ html, className: '', iconSize: undefined });
  }, [look.color, look.text, selected, dimmed]);

  if (station.latitude === null || station.longitude === null) return null;

  return (
    <Marker
      position={[station.latitude, station.longitude]}
      icon={icon}
      zIndexOffset={selected ? 1000 : 0}
      eventHandlers={{ click: onPress }}
    />
  );
}
