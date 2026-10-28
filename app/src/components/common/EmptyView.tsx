import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { appColors } from '@/constants/appColors';

/** TRẠNG THÁI RỖNG (chưa có dữ liệu / không có kết quả), có thể kèm nút hành động. */
export function EmptyView({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <View style={styles.box}>
      <Text style={styles.text}>{text}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: 24, alignItems: 'center', gap: 12 },
  text: { color: appColors.textMuted, textAlign: 'center' },
});
