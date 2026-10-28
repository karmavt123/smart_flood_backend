import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { floodLevelStyles } from '@/constants/floodLevelStyles';
import { openStationDetail } from '@/navigation/openStationDetail';
import { useRealtime } from '@/state/RealtimeProvider';

/**
 * DẢI CẢNH BÁO ở đầu màn hình khi một trạm vừa TĂNG mức ngập (FR-10), màu theo mức ngập.
 * Chạm vào → mở đúng trạm đó. Tự ẩn sau 12 giây.
 */
export function RealtimeAlertBanner() {
  const { bannerAlert, dismissBanner } = useRealtime();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!bannerAlert) return;
    const timer = setTimeout(dismissBanner, 12000);
    return () => clearTimeout(timer);
  }, [bannerAlert, dismissBanner]);

  if (!bannerAlert) return null;
  const level = floodLevelStyles[bannerAlert.level];

  return (
    <View style={[styles.wrap, { top: insets.top + 6 }]} pointerEvents="box-none">
      <Pressable
        style={[styles.banner, { backgroundColor: level.color }]}
        onPress={() => {
          dismissBanner();
          openStationDetail(bannerAlert.nodeId);
        }}
      >
        <Text style={styles.title}>
          🚨 {level.label.toUpperCase()}: {bannerAlert.stationName}
        </Text>
        <Text style={styles.text}>
          Ngập {bannerAlert.waterLevelCm.toFixed(1)} cm (ngưỡng nguy hiểm {bannerAlert.thresholdCm} cm) · chạm để xem
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 10, right: 10, zIndex: 100 },
  banner: { borderRadius: 14, padding: 12, elevation: 10, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8 },
  title: { color: '#fff', fontWeight: '900', fontSize: 15 },
  text: { color: '#fff', marginTop: 2 },
});
