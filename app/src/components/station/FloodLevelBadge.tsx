import { StyleSheet, Text, View } from 'react-native';

import { floodLevelStyles, STALE_STATION_COLOR } from '@/constants/floodLevelStyles';
import type { FloodLevel } from '@/types/FloodLevel';

/**
 * NHÃN MỨC NGẬP (màu + ký hiệu + chữ).
 * `stale = true` (trạm mất kết nối): nhãn chuyển viền xám và ghi "dữ liệu cũ",
 * để "Nguy hiểm" của nhiều ngày trước không bị hiểu là đang nguy hiểm, và "An toàn" cũ không bị hiểu là đang an toàn.
 */
export function FloodLevelBadge({ level, stale = false }: { level: FloodLevel; stale?: boolean }) {
  const style = floodLevelStyles[level];
  const text = `${style.symbol} ${style.label}`;
  if (stale && level !== 'unknown') {
    return (
      <View style={[styles.badge, styles.outline, { borderColor: STALE_STATION_COLOR }]}>
        <Text style={[styles.text, { color: '#64748B' }]}>{text} · dữ liệu cũ</Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, { backgroundColor: style.color }]}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  outline: { backgroundColor: 'transparent', borderWidth: 1 },
  text: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
