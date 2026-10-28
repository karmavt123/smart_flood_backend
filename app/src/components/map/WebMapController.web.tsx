import L from 'leaflet';
import { useEffect, type RefObject } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import type MapView from 'react-native-maps';

import type { LatLng } from '@/types/LatLng';

interface WebMapControllerProps {
  mapRef: RefObject<MapView | null>;
  onMapPress: () => void;
  onLongPress: (point: LatLng) => void;
  onMapReady: () => void;
}

/** Đổi "độ rộng vùng nhìn" (latitudeDelta của react-native-maps) sang mức zoom của Leaflet. */
function deltaToZoom(latitudeDelta: number): number {
  return Math.max(3, Math.min(18, Math.round(Math.log2(360 / Math.max(latitudeDelta, 0.0005)))));
}

/**
 * NỐI BẢN ĐỒ LEAFLET (web) VỚI MÀN HÌNH BẢN ĐỒ.
 * Màn hình Bản đồ (src/app/(tabs)/index.tsx) điều khiển bản đồ bằng 2 lệnh của react-native-maps:
 *   mapRef.current.animateToRegion(...)   → bay tới một chỗ
 *   mapRef.current.fitToCoordinates(...)  → thu/phóng cho thấy hết các điểm
 * File này làm 2 lệnh đó chạy được trên Leaflet, và chuyển sự kiện chuột:
 *   bấm chuột trái vào chỗ trống → onMapPress;  bấm chuột phải (hoặc chạm giữ) → onLongPress.
 * Nhờ vậy màn hình Bản đồ dùng chung 1 code cho cả điện thoại và web.
 */
export function WebMapController({ mapRef, onMapPress, onLongPress, onMapReady }: WebMapControllerProps) {
  const map = useMap();

  useMapEvents({
    click: () => onMapPress(),
    contextmenu: (e) => onLongPress({ latitude: e.latlng.lat, longitude: e.latlng.lng }),
  });

  useEffect(() => {
    const controller = {
      animateToRegion(region: LatLng & { latitudeDelta: number }, durationMs = 600) {
        try {
          map.flyTo([region.latitude, region.longitude], deltaToZoom(region.latitudeDelta), { duration: durationMs / 1000 });
        } catch {
          // Bản đồ vừa bị đóng (vd chuyển màn) → bỏ qua lệnh di chuyển.
        }
      },
      fitToCoordinates(
        points: LatLng[],
        options?: { edgePadding?: { top: number; right: number; bottom: number; left: number }; animated?: boolean },
      ) {
        if (points.length === 0) return;
        const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude] as [number, number]));
        const pad = options?.edgePadding ?? { top: 40, right: 40, bottom: 40, left: 40 };
        try {
          map.fitBounds(bounds, {
            paddingTopLeft: [pad.left, pad.top],
            paddingBottomRight: [pad.right, pad.bottom],
            animate: options?.animated ?? true,
            maxZoom: 16,
          });
        } catch {
          // Bản đồ vừa bị đóng → bỏ qua.
        }
      },
    };
    (mapRef as { current: unknown }).current = controller;
    onMapReady();
    return () => {
      // Bản đồ bị đóng → xóa bộ điều khiển để không ai gọi vào bản đồ đã mất nữa.
      if ((mapRef as { current: unknown }).current === controller) (mapRef as { current: unknown }).current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return null;
}
