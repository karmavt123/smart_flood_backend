import { StyleSheet, Text } from 'react-native';

import { appColors } from '@/constants/appColors';

/**
 * DÒNG BÁO "KHÔNG CẬP NHẬT ĐƯỢC" khi lần tải lại bị lỗi nhưng vẫn còn dữ liệu cũ để hiện.
 * (Lỗi mạng không được làm mất dữ liệu đang xem — NFR-03.)
 */
export function StaleDataWarning({ error }: { error: string | null }) {
  if (!error) return null;
  return <Text style={styles.text}>Không cập nhật được: {error} Đang hiện dữ liệu gần nhất.</Text>;
}

const styles = StyleSheet.create({
  text: { color: appColors.danger, fontSize: 12, marginBottom: 8 },
});
