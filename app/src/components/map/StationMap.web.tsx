import './leafletMapStyles.css';

import { MapContainer, TileLayer } from 'react-leaflet';
import { StyleSheet, View } from 'react-native';

import { DEFAULT_MAP_CENTER } from '@/config/appConfig';
import { isOutsideNearby } from '@/utils/isOutsideNearby';

import { FloodedRoadLines } from './FloodedRoadLines';
import { FloodZoneCircle } from './FloodZoneCircle';
import { NearbyRadiusCircle } from './NearbyRadiusCircle';
import { RouteLines } from './RouteLines';
import type { StationMapProps } from './StationMap';
import { StationMarker } from './StationMarker';
import { UserLocationDot } from './UserLocationDot.web';
import { WebMapController } from './WebMapController.web';

/**
 * BẢN ĐỒ TRẠM ĐO NGẬP KHI CHẠY TRÊN TRÌNH DUYỆT (laptop) — dùng thư viện Leaflet.
 * Nền bản đồ lấy từ OpenStreetMap (cần Internet).
 *
 * Expo tự chọn file này khi chạy web, và chọn StationMap.tsx khi chạy trên điện thoại.
 * Các file con (StationMarker, FloodZoneCircle, FloodedRoadLines, NearbyRadiusCircle, RouteLines)
 * cũng có bản .web.tsx riêng, nên trên web và điện thoại bản đồ hiện giống nhau.
 */
export function StationMap(props: StationMapProps) {
  const start = props.nearbyCenter ?? DEFAULT_MAP_CENTER;

  return (
    // zIndex: 0 để các nút, bộ lọc nổi phía trên bản đồ không bị lớp bản đồ che mất.
    <View style={[StyleSheet.absoluteFill, { zIndex: 0 }]}>
      <MapContainer center={[start.latitude, start.longitude]} zoom={13} zoomSnap={0.25} style={{ width: '100%', height: '100%' }} zoomControl={false}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />
        <WebMapController
          mapRef={props.mapRef}
          onMapPress={props.onMapPress}
          onLongPress={props.onLongPress}
          onMapReady={props.onMapReady}
        />
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
        {props.showUserLocation && props.userPosition ? <UserLocationDot position={props.userPosition} /> : null}
      </MapContainer>
    </View>
  );
}
