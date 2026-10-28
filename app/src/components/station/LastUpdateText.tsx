import { StyleSheet, Text } from 'react-native';

import { appColors } from '@/constants/appColors';
import { formatDateTime } from '@/utils/formatDateTime';
import { formatTimeAgo } from '@/utils/formatTimeAgo';

/**
 * DÒNG "CẬP NHẬT LÚC..." của trạm. Dữ liệu đã cũ thì chữ đỏ và ghi rõ "Dữ liệu đã cũ" (FR-06).
 */
export function LastUpdateText({ lastSeenAt, isFresh }: { lastSeenAt: string | null; isFresh: boolean }) {
  if (!lastSeenAt) return <Text style={styles.muted}>Trạm chưa gửi dữ liệu nào.</Text>;
  return (
    <Text style={isFresh ? styles.muted : styles.stale}>
      {isFresh ? '' : 'Dữ liệu đã cũ · '}Cập nhật {formatTimeAgo(lastSeenAt)} ({formatDateTime(lastSeenAt)})
    </Text>
  );
}

const styles = StyleSheet.create({
  muted: { color: appColors.textMuted, fontSize: 13, marginTop: 6 },
  stale: { color: appColors.danger, fontSize: 13, marginTop: 6, fontWeight: '700' },
});
