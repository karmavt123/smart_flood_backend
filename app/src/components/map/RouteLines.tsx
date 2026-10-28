import { StyleSheet, Text, View } from 'react-native';
import { Marker, Polyline } from 'react-native-maps';

import { appColors } from '@/constants/appColors';
import type { LatLng } from '@/types/LatLng';
import type { RouteCheckResult } from '@/types/RouteCheckResult';

/**
 * VẼ TUYẾN ĐƯỜNG lên bản đồ (FR-14):
 *  - Điểm đi (A, xanh) và điểm đến (B, đỏ).
 *  - Tuyến chính: xanh dương nếu không đi gần vùng ngập; ĐỎ NÉT ĐỨT nếu có nguy cơ (không nên đi).
 *  - Tuyến tránh ngập: XANH LÁ, chỉ vẽ khi máy chủ xác nhận tuyến không giao vùng ngập nào.
 */
export function RouteLines({ start, end, result }: { start: LatLng | null; end: LatLng | null; result: RouteCheckResult | null }) {
  const risky = result ? result.riskLevel !== 'normal' : false;
  return (
    <>
      {result && result.directRoute.length > 1 ? (
        <Polyline
          coordinates={result.directRoute}
          strokeColor={risky ? appColors.routeRisky : appColors.primary}
          strokeWidth={5}
          lineDashPattern={risky ? [12, 8] : undefined}
        />
      ) : null}
      {result && risky && result.safeRouteFound && result.suggestedRoute.length > 1 ? (
        <Polyline coordinates={result.suggestedRoute} strokeColor={appColors.routeSafe} strokeWidth={6} />
      ) : null}
      {start ? <EndpointMarker point={start} label="A" color={appColors.routeSafe} /> : null}
      {end ? <EndpointMarker point={end} label="B" color={appColors.routeRisky} /> : null}
    </>
  );
}

function EndpointMarker({ point, label, color }: { point: LatLng; label: string; color: string }) {
  return (
    <Marker coordinate={point} anchor={{ x: 0.5, y: 0.5 }} zIndex={20}>
      <View style={[styles.dot, { backgroundColor: color }]}>
        <Text style={styles.text}>{label}</Text>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  dot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
  text: { color: '#fff', fontWeight: '900' },
});
