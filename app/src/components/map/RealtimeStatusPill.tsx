import { StyleSheet, Text, View } from 'react-native';

import { appColors } from '@/constants/appColors';

/** VIÊN TRẠNG THÁI nhỏ trên bản đồ: realtime đang kết nối hay không + số trạm có dữ liệu mới. */
export function RealtimeStatusPill({ connected, freshCount, total }: { connected: boolean; freshCount: number; total: number }) {
  return (
    <View style={styles.pill}>
      <View style={[styles.dot, { backgroundColor: connected ? '#16A34A' : '#DC2626' }]} />
      <Text style={styles.text}>
        {connected ? 'Realtime' : 'Mất realtime'} · {freshCount}/{total} trạm có dữ liệu mới
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#ffffffEE',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: appColors.border,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { color: appColors.text, fontSize: 12, fontWeight: '600' },
});
