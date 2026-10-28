import type { RefObject } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { type LongPressEvent, type MapPressEvent } from 'react-native-maps';

import { DEFAULT_MAP_CENTER } from '@/config/appConfig';
import type { FloodedRoad } from '@/types/FloodedRoad';
import type { LatLng } from '@/types/LatLng';
import type { RouteCheckResult } from '@/types/RouteCheckResult';
import type { Station } from '@/types/Station';
import { isOutsideNearby } from '@/utils/isOutsideNearby';

import { FloodedRoadLines } from './FloodedRoadLines';
import { FloodZoneCircle } from './FloodZoneCircle';
import { NearbyRadiusCircle } from './NearbyRadiusCircle';
import { RouteLines } from './RouteLines';
import { StationMarker } from './StationMarker';

export interface StationMapProps {
  mapRef: RefObject<MapView | null>;
  stations: Station[];
  selectedNodeId: string | null;
  onSelectStation: (nodeId: string) => void;
  /** Chạm vào chỗ trống trên bản đồ. */
  onMapPress: () => void;
  /** Chạm giữ trên bản đồ (chọn điểm đi/đến khi kiểm tra tuyến, hoặc chọn điểm để xem ngập quanh đó). */
  onLongPress: (point: LatLng) => void;
  routeStart: LatLng | null;
  routeEnd: LatLng | null;
  routeResult: RouteCheckResult | null;
  /** Tâm vòng "Quanh bạn" (null = chưa có). */
  nearbyCenter: LatLng | null;
  nearbyRadiusM: number;
  /** Các đoạn đường bị ngập trong vòng "Quanh bạn" để tô màu. */
  floodedRoads: FloodedRoad[];
  /** Mã các trạm ĐÃ được tô màu đường → vòng tròn vùng ảnh hưởng của trạm đó vẽ nhạt đi cho đỡ rối. */
  roadsDrawnFor: string[];
  /** Hiện chấm xanh vị trí của tôi (chỉ bật sau khi người dùng cho phép). */
  showUserLocation: boolean;
  /** Vị trí của tôi. Bản đồ điện thoại tự biết vị trí nên không cần; bản đồ web cần để vẽ chấm xanh. */
  userPosition: LatLng | null;
  /** Bản đồ đã sẵn sàng (lúc này mới được di chuyển camera). */
  onMapReady: () => void;
}

/**
 * BẢN ĐỒ TRẠM ĐO NGẬP TRÊN ĐIỆN THOẠI (FR-04) — chỉ lo phần VẼ:
 * vòng "Quanh bạn" 2 km, đường bị ngập (tô màu), vùng ảnh hưởng, trạm, tuyến đường.
 * Khi chạy trên trình duyệt, Expo dùng StationMap.web.tsx (bản đồ Leaflet) thay cho file này.
 * Màn hình Bản đồ (src/app/(tabs)/index.tsx) lo phần xử lý bấm nút, chọn trạm...
 */
export function StationMap(props: StationMapProps) {
  const start = props.nearbyCenter ?? DEFAULT_MAP_CENTER;
  const initialRegion = { ...start, latitudeDelta: 0.05, longitudeDelta: 0.05 };

  const handlePress = (event: MapPressEvent) => {
    // Android: chạm vào trạm cũng tính là chạm bản đồ → bỏ qua trường hợp đó.
    if (event.nativeEvent.action === 'marker-press') return;
    props.onMapPress();
  };

  const handleLongPress = (event: LongPressEvent) => props.onLongPress(event.nativeEvent.coordinate);

  return (
    <MapView
      ref={props.mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={initialRegion}
      onPress={handlePress}
      onLongPress={handleLongPress}
      onMapReady={props.onMapReady}
      showsUserLocation={props.showUserLocation}
      showsMyLocationButton={false}
      toolbarEnabled={false}
    >
      {props.nearbyCenter ? <NearbyRadiusCircle center={props.nearbyCenter} radiusM={props.nearbyRadiusM} /> : null}
      {props.stations.map((station) => (
        <FloodZoneCircle key={`zone-${station.nodeId}`} station={station} faint={props.roadsDrawnFor.includes(station.nodeId)} />
      ))}
      <FloodedRoadLines roads={props.floodedRoads} />
      {props.stations.map((station) => (
        <StationMarker
          key={`marker-${station.nodeId}`}
          station={station}
          selected={station.nodeId === props.selectedNodeId}
          dimmed={isOutsideNearby(station, props.nearbyCenter, props.nearbyRadiusM)}
          onPress={() => props.onSelectStation(station.nodeId)}
        />
      ))}
      <RouteLines start={props.routeStart} end={props.routeEnd} result={props.routeResult} />
    </MapView>
  );
}
