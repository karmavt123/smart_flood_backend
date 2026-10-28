import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type MapView from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { checkRouteFloodRisk } from '@/api/route/checkRouteFloodRisk';
import { DemoModeBanner } from '@/components/common/DemoModeBanner';
import { MapFilterBar } from '@/components/map/MapFilterBar';
import { MapLegend } from '@/components/map/MapLegend';
import { MapRoundButton } from '@/components/map/MapRoundButton';
import { NearbySummaryCard } from '@/components/map/NearbySummaryCard';
import { RealtimeStatusPill } from '@/components/map/RealtimeStatusPill';
import { RouteCheckPanel } from '@/components/map/RouteCheckPanel';
import { StationInfoSheet } from '@/components/map/StationInfoSheet';
import { StationMap } from '@/components/map/StationMap';
import { DEFAULT_MAP_CENTER, DEMO_MODE, NEARBY_RADIUS_M } from '@/config/appConfig';
import { appColors } from '@/constants/appColors';
import { PICK_POINT_ON_MAP } from '@/constants/mapGestureText';
import { DEMO_USER_POSITION } from '@/demo/demoStations';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { useNearbyFlooding } from '@/hooks/useNearbyFlooding';
import { openStationDetail } from '@/navigation/openStationDetail';
import { useFavorites } from '@/state/FavoritesProvider';
import { useRealtime } from '@/state/RealtimeProvider';
import { useStations } from '@/state/StationsProvider';
import type { LatLng } from '@/types/LatLng';
import type { RouteCheckResult } from '@/types/RouteCheckResult';
import type { NearbyCenterSource } from '@/utils/describeNearbyCenter';
import { filterStations, type StationFilter } from '@/utils/filterStations';
import { circleBoundsPoints } from '@/utils/circleBoundsPoints';
import { findUnreliableStationsNearRoute } from '@/utils/findUnreliableStationsNearRoute';
import { isStationDataFresh } from '@/utils/isStationDataFresh';

/** Chừa chỗ cho thanh lọc phía trên và thẻ "Quanh bạn" phía dưới khi thu/phóng cho vừa vòng 2 km. */
const NEARBY_EDGE_PADDING = { top: 110, right: 50, bottom: 300, left: 20 };

/**
 * MÀN HÌNH BẢN ĐỒ — màn hình chính của app (FR-04, FR-13, FR-14).
 * Mở app lên là thấy NGAY TÌNH HÌNH NGẬP QUANH MÌNH:
 *  - Bản đồ zoom vào vị trí của bạn, vẽ vòng 2 km; đường nào trong vòng bị ngập thì tô màu theo mức ngập.
 *  - Thẻ "Quanh bạn" ở đáy: có ngập gần bạn không, các điểm ngập gần nhất, tên đường bị ngập.
 *  - Trạm ngoài vòng 2 km vẫn hiện nhưng mờ đi.
 *  - Chạm giữ (laptop: chuột phải) lên bản đồ → xem ngập quanh điểm đó. Nút ◎ → quay về vị trí của bạn.
 *  - Lọc trạm, chạm trạm → thẻ thông tin, nút ⇄ → kiểm tra tuyến đường có ngập không.
 */
export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);
  const { stations, loading, error, refresh, selectStation, findStation } = useStations();
  const { followedIds } = useFavorites();
  const { connected, liveStations } = useRealtime();
  const location = useCurrentLocation();
  const { focus, at } = useLocalSearchParams<{ focus?: string; at?: string }>();

  const [filter, setFilter] = useState<StationFilter>('all');
  const [sheetNodeId, setSheetNodeId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Tâm vòng "Quanh bạn"
  const [nearbyCenter, setNearbyCenter] = useState<LatLng | null>(null);
  const [centerSource, setCenterSource] = useState<NearbyCenterSource>('default');

  // Trạng thái kiểm tra tuyến đường
  const [routeMode, setRouteMode] = useState(false);
  const [routeStart, setRouteStart] = useState<LatLng | null>(null);
  const [routeEnd, setRouteEnd] = useState<LatLng | null>(null);
  const [routeResult, setRouteResult] = useState<RouteCheckResult | null>(null);
  /** Số thứ tự lần kiểm tra tuyến gần nhất — để bỏ qua kết quả cũ về muộn. */
  const routeRequestIdRef = useRef(0);
  const [routeChecking, setRouteChecking] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Có dữ liệu realtime mới → tải lại "Quanh bạn".
  const liveStamp = useMemo(
    () => Object.values(liveStations).map((s) => `${s.nodeId}:${s.lastSeenAt}`).join('|'),
    [liveStations],
  );
  const nearby = useNearbyFlooding(nearbyCenter, NEARBY_RADIUS_M, liveStamp);
  const floodedRoads = nearby.data?.floodedRoads ?? [];
  const roadsDrawnFor = useMemo(() => [...new Set(floodedRoads.map((r) => r.nodeId))], [floodedRoads]);

  const visibleStations = useMemo(() => filterStations(stations, filter, followedIds), [stations, filter, followedIds]);
  const counts = useMemo(
    () => ({
      all: stations.length,
      flooding: filterStations(stations, 'flooding', followedIds).length,
      followed: filterStations(stations, 'followed', followedIds).length,
      offline: filterStations(stations, 'offline', followedIds).length,
    }),
    [stations, followedIds],
  );
  const freshCount = stations.filter(isStationDataFresh).length;
  const sheetStation = sheetNodeId ? findStation(sheetNodeId) : undefined;
  const unreliableNearRoute = useMemo(() => {
    if (!routeResult) return [];
    const line = routeResult.directRoute.length > 1 ? routeResult.directRoute : [routeStart, routeEnd].filter((p): p is LatLng => p !== null);
    return findUnreliableStationsNearRoute(stations, line);
  }, [routeResult, routeStart, routeEnd, stations]);

  const moveCamera = (point: LatLng, delta = 0.03) =>
    mapRef.current?.animateToRegion({ ...point, latitudeDelta: delta, longitudeDelta: delta }, 600);

  /** Đặt tâm vòng "Quanh bạn" và thu/phóng bản đồ cho thấy trọn vòng 2 km (không bị thẻ bên dưới che). */
  const showNearby = (center: LatLng, source: NearbyCenterSource) => {
    setNearbyCenter(center);
    setCenterSource(source);
    mapRef.current?.fitToCoordinates(circleBoundsPoints(center, NEARBY_RADIUS_M), {
      edgePadding: NEARBY_EDGE_PADDING,
      animated: true,
    });
  };

  // Tự ẩn dòng thông báo nhỏ sau 9 giây.
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 9000);
    return () => clearTimeout(timer);
  }, [message]);

  // MỞ APP → lấy vị trí ngay để xem ngập quanh mình (chế độ demo dùng vị trí giả lập gần các trạm mẫu).
  useEffect(() => {
    if (!mapReady || nearbyCenter) return;
    if (DEMO_MODE) {
      showNearby(DEMO_USER_POSITION, 'demo');
      return;
    }
    location.requestLocation().then(({ position, error }) => {
      if (position) showNearby(position, 'me');
      else {
        showNearby(DEFAULT_MAP_CENTER, 'default');
        setMessage(`Đang xem quanh trung tâm TP.HCM. ${error ?? ''}`);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady]);

  // Mở bản đồ từ màn khác (openStationOnMap) với tham số focus=<mã trạm> → chọn và bay tới trạm đó.
  useEffect(() => {
    if (!focus || !mapReady) return;
    const station = findStation(focus);
    if (!station) return;
    setRouteMode(false);
    setFilter('all');
    setSheetNodeId(station.nodeId);
    if (station.latitude !== null && station.longitude !== null) {
      moveCamera({ latitude: station.latitude, longitude: station.longitude });
    } else {
      setMessage('Trạm này chưa có tọa độ nên không hiện trên bản đồ.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, at, mapReady, stations.length > 0]);

  const onSelectStation = (nodeId: string) => {
    if (routeMode) return; // đang chọn tuyến thì không mở thẻ trạm
    setSheetNodeId(nodeId);
    selectStation(nodeId);
  };

  /** Chạm 1 điểm ngập trong thẻ "Quanh bạn" → bay tới trạm đó và mở thẻ trạm. */
  const onPickNearbyStation = (nodeId: string) => {
    const station = findStation(nodeId);
    setFilter('all');
    onSelectStation(nodeId);
    if (station?.latitude != null && station.longitude != null) {
      moveCamera({ latitude: station.latitude, longitude: station.longitude }, 0.015);
    }
  };

  const onMyLocation = async () => {
    const { position, error } = await location.requestLocation();
    if (!position) {
      setMessage(error);
      return;
    }
    setSheetNodeId(null);
    showNearby(position, 'me');
  };

  const resetRoute = () => {
    // Đổi điểm / thoát chế độ tuyến → bỏ qua kết quả kiểm tra tuyến cũ còn đang chờ máy chủ trả về.
    routeRequestIdRef.current += 1;
    setRouteStart(null);
    setRouteEnd(null);
    setRouteResult(null);
    setRouteError(null);
    setRouteChecking(false);
  };

  const toggleRouteMode = () => {
    resetRoute();
    setSheetNodeId(null);
    setRouteMode((on) => !on);
  };

  const onLongPress = (point: LatLng) => {
    if (!routeMode) {
      // Không ở chế độ tuyến đường → xem ngập quanh điểm vừa chọn.
      setSheetNodeId(null);
      showNearby(point, 'picked');
      setMessage('Đang xem ngập quanh điểm bạn chọn. Bấm ◎ để quay về vị trí của bạn.');
      return;
    }
    if (!routeStart || (routeStart && routeEnd)) {
      resetRoute();
      setRouteStart(point);
    } else {
      setRouteEnd(point);
    }
  };

  const onUseMyLocationAsStart = async () => {
    const { position, error } = await location.requestLocation();
    if (position) {
      setRouteStart(position);
      moveCamera(position);
    } else {
      setRouteError(`${error ?? 'Chưa lấy được vị trí.'} Hoặc ${PICK_POINT_ON_MAP} để chọn điểm đi.`);
    }
  };

  const onCheckRoute = async () => {
    if (!routeStart || !routeEnd) return;
    const requestId = ++routeRequestIdRef.current;
    const isOutdated = () => requestId !== routeRequestIdRef.current;
    setRouteChecking(true);
    setRouteError(null);
    try {
      const result = await checkRouteFloodRisk(routeStart, routeEnd);
      if (isOutdated()) return; // người dùng đã chọn tuyến khác hoặc thoát chế độ tuyến trong lúc chờ
      setRouteResult(result);
      const points = [...result.directRoute, ...result.suggestedRoute];
      if (points.length > 1) {
        mapRef.current?.fitToCoordinates(points, { edgePadding: { top: 140, right: 70, bottom: 330, left: 50 }, animated: true });
      }
    } catch (e) {
      if (!isOutdated()) setRouteError(e instanceof Error ? e.message : 'Không kiểm tra được tuyến đường.');
    } finally {
      if (!isOutdated()) setRouteChecking(false);
    }
  };

  const onRefresh = () => {
    refresh();
    nearby.reload();
  };

  return (
    <View style={styles.screen}>
      <StationMap
        mapRef={mapRef}
        stations={visibleStations}
        selectedNodeId={sheetNodeId}
        onSelectStation={onSelectStation}
        onMapPress={() => setSheetNodeId(null)}
        onLongPress={onLongPress}
        routeStart={routeMode ? routeStart : null}
        routeEnd={routeMode ? routeEnd : null}
        routeResult={routeMode ? routeResult : null}
        nearbyCenter={routeMode ? null : nearbyCenter}
        nearbyRadiusM={NEARBY_RADIUS_M}
        floodedRoads={routeMode ? [] : floodedRoads}
        roadsDrawnFor={routeMode ? [] : roadsDrawnFor}
        showUserLocation={location.status === 'ready'}
        userPosition={location.position}
        onMapReady={() => setMapReady(true)}
      />

      {/* Phần nổi phía trên: bộ lọc + trạng thái */}
      <View style={[styles.top, { paddingTop: insets.top + 4 }]} pointerEvents="box-none">
        <DemoModeBanner />
        <MapFilterBar value={filter} counts={counts} onChange={setFilter} />
        <RealtimeStatusPill connected={connected} freshCount={freshCount} total={stations.length} />
        {error ? <Text style={styles.errorPill}>Không tải được trạm: {error}</Text> : null}
        {loading && stations.length === 0 ? <Text style={styles.infoPill}>Đang tải danh sách trạm…</Text> : null}
        {!loading && !error && stations.length === 0 ? <Text style={styles.infoPill}>Chưa có trạm nào hoạt động.</Text> : null}
      </View>

      {/* Nút tròn bên phải */}
      <View style={[styles.rightButtons, { top: insets.top + 118 }]}>
        <MapRoundButton icon="◎" label="Ngập quanh vị trí của tôi" busy={location.status === 'loading'} onPress={onMyLocation} />
        <MapRoundButton icon="⇄" label="Kiểm tra tuyến đường" active={routeMode} onPress={toggleRouteMode} />
        <MapRoundButton icon="⟳" label="Tải lại dữ liệu" onPress={onRefresh} />
      </View>

      {/* Phần đáy: thông báo nhỏ + khung tuyến đường / thẻ trạm / thẻ "Quanh bạn" */}
      <View style={styles.bottom} pointerEvents="box-none">
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {routeMode ? (
          <RouteCheckPanel
            start={routeStart}
            end={routeEnd}
            result={routeResult}
            unreliableStations={unreliableNearRoute}
            checking={routeChecking}
            error={routeError}
            locating={location.status === 'loading'}
            onUseMyLocation={onUseMyLocationAsStart}
            onCheck={onCheckRoute}
            onReset={resetRoute}
            onClose={toggleRouteMode}
          />
        ) : sheetStation ? (
          <StationInfoSheet
            station={sheetStation}
            onOpenDetail={() => openStationDetail(sheetStation.nodeId)}
            onClose={() => setSheetNodeId(null)}
          />
        ) : (
          <>
            <MapLegend />
            <NearbySummaryCard
              nearby={nearby.data}
              loading={nearby.loading}
              error={nearby.error}
              centerSource={centerSource}
              radiusM={NEARBY_RADIUS_M}
              onSelectStation={onPickNearbyStation}
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: appColors.background },
  top: { position: 'absolute', top: 0, left: 0, right: 0, gap: 6 },
  rightButtons: { position: 'absolute', right: 12 },
  bottom: { position: 'absolute', left: 12, right: 12, bottom: 12, gap: 8, alignItems: 'stretch' },
  message: {
    alignSelf: 'center',
    backgroundColor: '#0F172AE6',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    overflow: 'hidden',
    textAlign: 'center',
  },
  errorPill: {
    alignSelf: 'flex-start',
    marginLeft: 12,
    backgroundColor: '#FEE2E2',
    color: appColors.danger,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
  },
  infoPill: {
    alignSelf: 'flex-start',
    marginLeft: 12,
    backgroundColor: '#ffffffEE',
    color: appColors.text,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
  },
});
