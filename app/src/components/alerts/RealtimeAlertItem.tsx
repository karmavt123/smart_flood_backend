import { Pressable, StyleSheet, Text } from 'react-native';

import { appColors } from '@/constants/appColors';
import type { RealtimeFloodEvent } from '@/types/RealtimeFloodEvent';
import { formatDateTime } from '@/utils/formatDateTime';

import { FloodLevelBadge } from '../station/FloodLevelBadge';

/** MỘT CẢNH BÁO REALTIME nhận được khi app đang mở (FR-11): trạm, mức ngập mới, độ ngập, thời điểm. */
export function RealtimeAlertItem({ event, onPress }: { event: RealtimeFloodEvent; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}>
      <Text style={styles.name}>{event.stationName}</Text>
      <FloodLevelBadge level={event.level} />
      <Text style={styles.text}>
        Ngập {event.waterLevelCm.toFixed(1)} cm (ngưỡng nguy hiểm {event.thresholdCm} cm)
      </Text>
      <Text style={styles.muted}>{formatDateTime(event.timestamp)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    backgroundColor: '#FFF5F5',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FBC9C9',
  },
  name: { fontWeight: '800', fontSize: 15, color: appColors.text },
  text: { color: appColors.text },
  muted: { color: appColors.textMuted, fontSize: 12 },
});
