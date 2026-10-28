import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';

import type { Station } from '@/types/Station';
import { getStationMarkerLook } from '@/utils/getStationMarkerLook';

/**
 * ĐIỂM TRẠM TRÊN BẢN ĐỒ ĐIỆN THOẠI (FR-04): một "nhãn" màu theo mức ngập, ghi luôn độ ngập.
 *  - Màu + ký hiệu theo mức ngập (không chỉ dựa vào màu).
 *  - Trạm mất kết nối: màu xám, ghi "cũ".
 *  - Trạm đang chọn: to hơn, viền đậm.
 *  - Trạm nằm ngoài vòng "Quanh bạn" (dimmed): mờ đi.
 * Bản cho trình duyệt nằm ở StationMarker.web.tsx.
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

  // Android chỉ vẽ lại nhãn khi tracksViewChanges = true. Bật trong chốc lát mỗi khi nội dung đổi
  // rồi tắt để bản đồ chạy mượt.
  const [tracksChanges, setTracksChanges] = useState(true);
  useEffect(() => {
    setTracksChanges(true);
    const timer = setTimeout(() => setTracksChanges(false), 600);
    return () => clearTimeout(timer);
  }, [look.text, look.color, selected, dimmed]);

  if (station.latitude === null || station.longitude === null) return null;

  return (
    <Marker
      coordinate={{ latitude: station.latitude, longitude: station.longitude }}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={tracksChanges}
      zIndex={selected ? 10 : 1}
      onPress={onPress}
    >
      <View style={[styles.wrap, dimmed && !selected && styles.dimmed]}>
        <View style={[styles.pill, { backgroundColor: look.color }, selected && styles.selected]}>
          <Text style={[styles.text, selected && styles.textSelected]}>{look.text}</Text>
        </View>
        <View style={[styles.pointer, { borderTopColor: look.color }]} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  dimmed: { opacity: 0.45 },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
  },
  selected: { borderColor: '#0F172A', paddingHorizontal: 11, paddingVertical: 6 },
  text: { color: '#fff', fontWeight: '900', fontSize: 12 },
  textSelected: { fontSize: 15 },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
