import L from 'leaflet';
import { Marker, Polyline } from 'react-leaflet';

import { appColors } from '@/constants/appColors';
import type { LatLng } from '@/types/LatLng';
import type { RouteCheckResult } from '@/types/RouteCheckResult';

/** Đổi tọa độ của app sang dạng [vĩ độ, kinh độ] mà Leaflet dùng. */
const toLeaflet = (points: LatLng[]) => points.map((p) => [p.latitude, p.longitude] as [number, number]);

/** Chấm tròn có chữ A / B cho điểm đi, điểm đến. */
const endpointIcon = (label: string, color: string) =>
  L.divIcon({
    className: '',
    iconSize: undefined,
    html: `<div style="transform:translate(-50%,-50%);width:30px;height:30px;border-radius:15px;background:${color};
                       border:3px solid #fff;color:#fff;font:900 14px system-ui,sans-serif;display:flex;
                       align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.35);">${label}</div>`,
  });

/**
 * VẼ TUYẾN ĐƯỜNG trên bản đồ WEB (Leaflet) — giống bản điện thoại (RouteLines.tsx):
 * tuyến chính xanh dương (an toàn) hoặc ĐỎ NÉT ĐỨT (có nguy cơ), tuyến tránh ngập xanh lá, điểm A/B.
 */
export function RouteLines({ start, end, result }: { start: LatLng | null; end: LatLng | null; result: RouteCheckResult | null }) {
  const risky = result ? result.riskLevel !== 'normal' : false;
  return (
    <>
      {result && result.directRoute.length > 1 ? (
        <Polyline
          positions={toLeaflet(result.directRoute)}
          pathOptions={{ color: risky ? appColors.routeRisky : appColors.primary, weight: 5, dashArray: risky ? '12 8' : undefined }}
        />
      ) : null}
      {result && risky && result.safeRouteFound && result.suggestedRoute.length > 1 ? (
        <Polyline positions={toLeaflet(result.suggestedRoute)} pathOptions={{ color: appColors.routeSafe, weight: 6 }} />
      ) : null}
      {start ? <Marker position={[start.latitude, start.longitude]} icon={endpointIcon('A', appColors.routeSafe)} zIndexOffset={2000} /> : null}
      {end ? <Marker position={[end.latitude, end.longitude]} icon={endpointIcon('B', appColors.routeRisky)} zIndexOffset={2000} /> : null}
    </>
  );
}
