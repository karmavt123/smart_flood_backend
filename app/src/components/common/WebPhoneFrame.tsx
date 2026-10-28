import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

/**
 * KHUNG "ĐIỆN THOẠI" KHI CHẠY TRÊN LAPTOP.
 * App được thiết kế cho màn hình điện thoại, nên trên trình duyệt màn hình rộng
 * app hiện trong một cột rộng tối đa 480px ở giữa (giống đang cầm điện thoại).
 * Trên điện thoại thật thì không làm gì cả.
 */
export function WebPhoneFrame({ children }: { children: ReactNode }) {
  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <View style={styles.page}>
      <View style={styles.phone}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#CBD5E1', alignItems: 'center' },
  phone: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 24,
  },
});
