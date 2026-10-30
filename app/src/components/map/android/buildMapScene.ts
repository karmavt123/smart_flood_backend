import { appColors } from '@/constants/appColors';
import { floodLevelStyles } from '@/constants/floodLevelStyles';
import { getStationMarkerLook } from '@/utils/getStationMarkerLook';
import { isOutsideNearby } from '@/utils/isOutsideNearby';
import { isStationDataFresh } from '@/utils/isStationDataFresh';

import type { StationMapProps } from '../StationMap';

type Point = [number, number];

/** 1 vòng tròn trên bản đồ (tâm, bán kính mét, kiểu vẽ của Leaflet). */
export interface SceneCircle {
  center: Point;
  radiusM: number;
  style: Record<string, unknown>;
}

/** 1 đường (đường bị ngập, tuyến đi). */
export interface ScenePolyline {
  points: Point[];
  style: Record<string, unknown>;
}

/** 1 nhãn trạm hoặc điểm A/B: vẽ bằng HTML giống hệt bản web. `id` có thì bấm vào được. */
export interface SceneMarker {
  id: string | null;
  position: Point;
  html: string;
  zIndex: number;
}

/** Toàn bộ những gì cần vẽ trên bản đồ — gửi 1 lần sang WebView mỗi khi có thay đổi. */
export interface MapScene {
  circles: SceneCircle[];
  polylines: ScenePolyline[];
  markers: SceneMarker[];
  userPosition: Point | null;
}

const toPoint = (p: { latitude: number; longitude: number }): Point => [p.latitude, p.longitude];

/** Điểm A / B của tuyến đường (giống RouteLines.web.tsx). */
function endpointHtml(label: string, color: string) {
  return `<div style="transform:translate(-50%,-50%);width:30px;height:30px;border-radius:15px;background:${color};border:3px solid #fff;color:#fff;font:900 14px system-ui,sans-serif;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.35);">${label}</div>`;
}

/** Nhãn trạm (giống StationMarker.web.tsx): màu theo mức ngập, trạm đang chọn to hơn, trạm ngoài vòng mờ đi. */
function stationHtml(color: string, text: string, selected: boolean, dimmed: boolean) {
  const border = selected ? '#0F172A' : '#ffffff';
  const padding = selected ? '6px 11px' : '4px 8px';
  const fontSize = selected ? 15 : 12;
  return `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);opacity:${dimmed && !selected ? 0.45 : 1};"><div style="background:${color};color:#fff;font:900 ${fontSize}px system-ui,sans-serif;white-space:nowrap;padding:${padding};border-radius:12px;border:2px solid ${border};box-shadow:0 1px 4px rgba(0,0,0,.35);">${text}</div><div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${color};"></div></div>`;
}

/**
 * ĐỔI CÁC PROPS CỦA BẢN ĐỒ THÀNH "CẢNH" ĐỂ VẼ TRONG WEBVIEW (bản đồ Android).
 * Cùng quy tắc với các file .web.tsx (bản đồ trình duyệt), nên Android và web hiện giống nhau:
 * vòng "Quanh bạn" nét đứt, vùng ảnh hưởng ngập, đường bị ngập tô màu, nhãn trạm, tuyến đường A → B, chấm vị trí của tôi.
 */
export function buildMapScene(props: StationMapProps): MapScene {
  const circles: SceneCircle[] = [];
  const polylines: ScenePolyline[] = [];
  const markers: SceneMarker[] = [];

  if (props.nearbyCenter) {
    circles.push({
      center: toPoint(props.nearbyCenter),
      radiusM: props.nearbyRadiusM,
      style: { color: appColors.primary, weight: 2, dashArray: '10 8', fillColor: appColors.primary, fillOpacity: 0.06, interactive: false },
    });
  }

  for (const station of props.stations) {
    if (station.latitude === null || station.longitude === null) continue;
    if (station.floodRadiusM <= 0 || !isStationDataFresh(station)) continue;
    const color = floodLevelStyles[station.floodLevel].color;
    const faint = props.roadsDrawnFor.includes(station.nodeId);
    circles.push({
      center: [station.latitude, station.longitude],
      radiusM: station.floodRadiusM,
      style: { color, weight: faint ? 1 : 2, fillColor: color, fillOpacity: faint ? 0.12 : 0.2, interactive: false },
    });
  }

  for (const road of props.floodedRoads) {
    polylines.push({ points: road.path.map(toPoint), style: { color: '#FFFFFF', weight: 9, lineCap: 'round', opacity: 0.9, interactive: false } });
  }
  for (const road of props.floodedRoads) {
    polylines.push({
      points: road.path.map(toPoint),
      style: { color: floodLevelStyles[road.level].color, weight: 6, lineCap: 'round', opacity: 0.95, interactive: false },
    });
  }

  const result = props.routeResult;
  const risky = result ? result.riskLevel !== 'normal' : false;
  if (result && result.directRoute.length > 1) {
    polylines.push({
      points: result.directRoute.map(toPoint),
      style: { color: risky ? appColors.routeRisky : appColors.primary, weight: 5, dashArray: risky ? '12 8' : null, interactive: false },
    });
  }
  if (result && risky && result.safeRouteFound && result.suggestedRoute.length > 1) {
    polylines.push({ points: result.suggestedRoute.map(toPoint), style: { color: appColors.routeSafe, weight: 6, interactive: false } });
  }

  for (const station of props.stations) {
    if (station.latitude === null || station.longitude === null) continue;
    const look = getStationMarkerLook(station);
    const selected = station.nodeId === props.selectedNodeId;
    const dimmed = isOutsideNearby(station, props.nearbyCenter, props.nearbyRadiusM);
    markers.push({
      id: station.nodeId,
      position: [station.latitude, station.longitude],
      html: stationHtml(look.color, look.text, selected, dimmed),
      zIndex: selected ? 1000 : 0,
    });
  }
  if (props.routeStart) markers.push({ id: null, position: toPoint(props.routeStart), html: endpointHtml('A', appColors.routeSafe), zIndex: 2000 });
  if (props.routeEnd) markers.push({ id: null, position: toPoint(props.routeEnd), html: endpointHtml('B', appColors.routeRisky), zIndex: 2000 });

  const userPosition = props.showUserLocation && props.userPosition ? toPoint(props.userPosition) : null;
  return { circles, polylines, markers, userPosition };
}
