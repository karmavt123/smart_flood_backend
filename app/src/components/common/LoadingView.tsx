import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { appColors } from '@/constants/appColors';

/** TRẠNG THÁI ĐANG TẢI (vòng quay + chữ). */
export function LoadingView({ text = 'Đang tải…' }: { text?: string }) {
  return (
    <View style={styles.box}>
      <ActivityIndicator color={appColors.primary} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: 28, alignItems: 'center', justifyContent: 'center', gap: 10 },
  text: { color: appColors.textMuted },
});
