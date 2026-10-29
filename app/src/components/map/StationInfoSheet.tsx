import { Pressable, StyleSheet, Text, View } from 'react-native';

import { appColors } from '@/constants/appColors';
import type { Station } from '@/types/Station';
import { formatQuickReadings } from '@/utils/formatQuickReadings';
import { formatSensorValue } from '@/utils/formatSensorValue';
import { isStationDataFresh } from '@/utils/isStationDataFresh';

import { AppButton } from '../common/AppButton';
import { ConnectionBadge } from '../station/ConnectionBadge';
import { FloodLevelBadge } from '../station/FloodLevelBadge';
import { ForecastBox } from '../station/ForecastBox';
import { FollowButton } from '../station/FollowButton';
import { LastUpdateText } from '../station/LastUpdateText';

interface StationInfoSheetProps {
  station: Station;
  onOpenDetail: () => void;
  onClose: () => void;
}

/**
 * THẺ THÔNG TIN TRẠM hiện ở đáy bản đồ khi chạm vào một trạm (FR-04):
 * tên, độ ngập hiện tại + ô "Sau 5 phút" (dự báo trạm gửi), thoát nước/mưa/triều, mức ngập, kết nối, thời điểm cập nhật, bán kính ảnh hưởng, nút Chi tiết / Theo dõi.
 */
export function StationInfoSheet({ station, onOpenDetail, onClose }: StationInfoSheetProps) {
  const fresh = isStationDataFresh(station);
  const quickReadings = fresh ? formatQuickReadings(station.latest) : null;
  return (
    <View style={styles.sheet}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={2}>
          {station.name}
        </Text>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Đóng">
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>
      <Text style={styles.muted}>Mã trạm: {station.nodeId}</Text>

      <View style={styles.levelRow}>
        <View style={styles.levelNow}>
          <Text style={styles.caption}>Hiện tại</Text>
          {station.waterLevelCm === null ? (
            <Text style={[styles.level, styles.levelMissing]}>{formatSensorValue(null, 'cm')}</Text>
          ) : (
            <Text style={[styles.level, !fresh && { color: '#94A3B8' }]} numberOfLines={1} adjustsFontSizeToFit>
              {station.waterLevelCm.toFixed(1)}
              <Text style={styles.unit}> cm</Text>
            </Text>
          )}
          <Text style={styles.muted}>ngưỡng nguy hiểm {station.thresholdCm} cm</Text>
        </View>
        <ForecastBox station={station} size="small" />
      </View>

      <View style={styles.badges}>
        <FloodLevelBadge level={station.floodLevel} stale={!fresh} />
        <ConnectionBadge state={station.connectionState} />
      </View>
      {quickReadings ? <Text style={styles.muted}>{quickReadings}</Text> : null}
      <LastUpdateText lastSeenAt={station.lastSeenAt} isFresh={fresh} />
      {fresh && station.floodRadiusM > 0 ? (
        <Text style={styles.note}>Vùng ảnh hưởng ước tính: bán kính {station.floodRadiusM} m (không phải ranh giới ngập đo được).</Text>
      ) : null}

      <View style={styles.buttons}>
        <AppButton title="Xem chi tiết" onPress={onOpenDetail} />
        <FollowButton nodeId={station.nodeId} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    gap: 4,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  name: { flex: 1, fontSize: 18, fontWeight: '900', color: appColors.text },
  close: { fontSize: 20, color: appColors.textMuted, fontWeight: '700' },
  muted: { color: appColors.textMuted },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  levelNow: { flex: 1 },
  caption: { color: appColors.textMuted, fontSize: 12, fontWeight: '700' },
  level: { fontSize: 36, fontWeight: '900', color: appColors.text },
  unit: { fontSize: 18, fontWeight: '800' },
  levelMissing: { fontSize: 20, marginVertical: 6 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  note: { color: appColors.textMuted, fontSize: 12, marginTop: 4 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 12 },
});
