import { type ComponentType, type Ref, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview';

import { API_BASE_URL, DEFAULT_MAP_CENTER } from '@/config/appConfig';
import type { LatLng } from '@/types/LatLng';

import { buildMapScene } from './android/buildMapScene';
import { buildMapHtml } from './android/mapHtml';
import type { StationMapProps } from './StationMap';

// Kiểu khai báo của WebView (class có tham số kiểu mặc định `undefined`) bị TypeScript hiểu thành props `never`
// → khai báo lại kiểu cho đúng, chạy y hệt WebView gốc.
const MapWebView = WebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WebView> }>;

/** Đổi "độ rộng vùng nhìn" (latitudeDelta của react-native-maps) sang mức zoom của Leaflet. */
function deltaToZoom(latitudeDelta: number): number {
  return Math.max(3, Math.min(18, Math.round(Math.log2(360 / Math.max(latitudeDelta, 0.0005)))));
}

/**
 * BẢN ĐỒ TRÊN ANDROID — Leaflet + OpenStreetMap chạy trong WebView, KHÔNG cần Google Maps API key
 * (file APK tự build mà dùng react-native-maps thì bắt buộc phải có key, thiếu là bản đồ trắng / app văng).
 * Expo tự chọn file này khi chạy Android (kể cả Expo Go); iPhone vẫn dùng StationMap.tsx, trình duyệt dùng StationMap.web.tsx.
 *
 * Màn Bản đồ điều khiển bản đồ qua mapRef giống hệt bản điện thoại:
 *   mapRef.current.animateToRegion(...) / fitToCoordinates(...)
 * File này đổi 2 lệnh đó thành lệnh cho Leaflet trong WebView, và chuyển ngược các lần chạm về màn hình.
 */
export function StationMap(props: StationMapProps) {
  const webRef = useRef<WebView | null>(null);
  const readyRef = useRef(false);
  const propsRef = useRef(props);
  propsRef.current = props;

  // HTML chỉ tạo 1 lần (tâm ban đầu); sau đó chỉ gửi "cảnh" mới sang, không tải lại bản đồ.
  const html = useMemo(() => {
    const start = props.nearbyCenter ?? DEFAULT_MAP_CENTER;
    return buildMapHtml([start.latitude, start.longitude]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scene = buildMapScene(props);
  const sceneJson = JSON.stringify(scene);

  const run = (code: string) => {
    if (!readyRef.current) return;
    webRef.current?.injectJavaScript(`${code};true;`);
  };

  useEffect(() => {
    run(`window.smartflood && window.smartflood.setScene(${sceneJson})`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneJson]);

  // Đăng ký bộ điều khiển cho màn Bản đồ (cùng 2 lệnh như react-native-maps).
  useEffect(() => {
    const controller = {
      animateToRegion(region: LatLng & { latitudeDelta: number }, durationMs = 600) {
        run(`window.smartflood.flyTo(${region.latitude},${region.longitude},${deltaToZoom(region.latitudeDelta)},${durationMs / 1000})`);
      },
      fitToCoordinates(
        points: LatLng[],
        options?: { edgePadding?: { top: number; right: number; bottom: number; left: number }; animated?: boolean },
      ) {
        if (points.length === 0) return;
        const pad = options?.edgePadding ?? { top: 40, right: 40, bottom: 40, left: 40 };
        const list = JSON.stringify(points.map((p) => [p.latitude, p.longitude]));
        run(`window.smartflood.fitBounds(${list},${JSON.stringify(pad)},${options?.animated ?? true})`);
      },
    };
    const mapRef = props.mapRef as { current: unknown };
    mapRef.current = controller;
    return () => {
      if (mapRef.current === controller) mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMessage = (event: WebViewMessageEvent) => {
    let msg: { type?: string; id?: string; latitude?: number; longitude?: number; text?: string };
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    const current = propsRef.current;
    if (msg.type === 'ready') {
      readyRef.current = true;
      webRef.current?.injectJavaScript(`window.smartflood.setScene(${JSON.stringify(buildMapScene(current))});true;`);
      current.onMapReady();
    } else if (msg.type === 'press') current.onMapPress();
    else if (msg.type === 'marker' && msg.id) current.onSelectStation(msg.id);
    else if (msg.type === 'log' && msg.text) console.warn(`[map] ${msg.text}`);
    else if (msg.type === 'longpress' && typeof msg.latitude === 'number' && typeof msg.longitude === 'number') {
      current.onLongPress({ latitude: msg.latitude, longitude: msg.longitude });
    }
  };

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 0 }]}>
      <MapWebView
        ref={webRef}
        // baseUrl: để máy chủ bản đồ OpenStreetMap biết yêu cầu đến từ đâu (họ chặn yêu cầu không rõ nguồn).
        source={{ html, baseUrl: `${API_BASE_URL}/` }}
        originWhitelist={['*']}
        onMessage={onMessage}
        javaScriptEnabled
        // Tên app trong User-Agent: máy chủ nền bản đồ chặn yêu cầu không rõ là ứng dụng nào.
        applicationNameForUserAgent="SmartFlood/1.0 (+https://flood.agentwf.xyz)"
        // Cho phép soi lỗi bản đồ bằng chrome://inspect trên laptop (cắm adb).
        webviewDebuggingEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        overScrollMode="never"
        style={styles.web}
        onLoadStart={() => {
          readyRef.current = false;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: '#E5E7EB' },
});
