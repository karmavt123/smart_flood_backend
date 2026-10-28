import { StyleSheet, Text, View } from 'react-native';

import { connectionStateStyles } from '@/constants/connectionStateStyles';
import type { ConnectionState } from '@/types/ConnectionState';

/** NHÃN TRẠNG THÁI KẾT NỐI của trạm: Online / Chậm dữ liệu / Offline / Chưa có dữ liệu. */
export function ConnectionBadge({ state }: { state: ConnectionState }) {
  const style = connectionStateStyles[state];
  return (
    <View style={[styles.badge, { borderColor: style.color }]}>
      <View style={[styles.dot, { backgroundColor: style.color }]} />
      <Text style={[styles.text, { color: style.color }]}>{style.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontWeight: '700', fontSize: 13 },
});
