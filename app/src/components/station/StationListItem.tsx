import { Pressable, StyleSheet, Text, View } from 'react-native';

import { appColors } from '@/constants/appColors';
import type { Station } from '@/types/Station';
import { formatSensorValue } from '@/utils/formatSensorValue';
import { formatTimeAgo } from '@/utils/formatTimeAgo';
import { isStationDataFresh } from '@/utils/isStationDataFresh';

import { ConnectionBadge } from './ConnectionBadge';
import { FloodLevelBadge } from './FloodLevelBadge';

interface StationListItemProps {
  station: Station;
  followed: boolean;
  /** Khoảng cách tới vị trí của tôi (đã định dạng), nếu có. */
  distanceText?: string;
  onPress: () => void;
}

/** MỘT DÒNG trong danh sách trạm (FR-05): tên, độ ngập, mức ngập, kết nối, theo dõi. */
export function StationListItem({ station, followed, distanceText, onPress }: StationListItemProps) {
  const fresh = isStationDataFresh(station);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>
          {followed ? '★ ' : ''}
          {station.name}
        </Text>
        <Text style={[styles.level, !fresh && { color: '#94A3B8' }]}>{formatSensorValue(station.waterLevelCm, 'cm')}</Text>
      </View>
      <View style={styles.badges}>
        <FloodLevelBadge level={station.floodLevel} stale={!fresh} />
        <ConnectionBadge state={station.connectionState} />
      </View>
      <Text style={styles.meta}>
        {station.nodeId} · cập nhật {formatTimeAgo(station.lastSeenAt)}
        {distanceText ? ` · cách ${distanceText}` : ''}
        {station.latitude === null ? ' · chưa có vị trí' : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    backgroundColor: appColors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: appColors.border,
    gap: 8,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 16, fontWeight: '800', color: appColors.text },
  level: { fontSize: 18, fontWeight: '900', color: appColors.text },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  meta: { color: appColors.textMuted, fontSize: 12 },
});
