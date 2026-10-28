import { StyleSheet, Text, View } from 'react-native';

import { appColors } from '@/constants/appColors';

import { AppButton } from './AppButton';

/** TRẠNG THÁI LỖI: hiện câu báo lỗi và nút "Thử lại". */
export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.box}>
      <Text style={styles.text}>{message}</Text>
      {onRetry ? (
        <View style={{ width: 160 }}>
          <AppButton title="Thử lại" variant="outline" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: 24, alignItems: 'center', gap: 12 },
  text: { color: appColors.danger, textAlign: 'center' },
});
