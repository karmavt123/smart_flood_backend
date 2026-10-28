import { StyleSheet, Text, View } from 'react-native';

import { appColors } from '@/constants/appColors';
import type { Station } from '@/types/Station';
import { formatSensorValue } from '@/utils/formatSensorValue';
import { isStationDataFresh } from '@/utils/isStationDataFresh';

import { Card } from '../common/Card';
import { ConnectionBadge } from './ConnectionBadge';
import { FloodLevelBadge } from './FloodLevelBadge';
import { LastUpdateText } from './LastUpdateText';

/**
 * THẺ ĐỘ NGẬP của một trạm — thông tin quan trọng nhất nên chữ to nhất (yêu cầu mục 2.2):
 * tên trạm, độ sâu ngập trên mặt đường, 3 ngưỡng, mức ngập, kết nối, thời điểm cập nhật.
 */
export function WaterLevelCard({ station }: { station: Station }) {
  const fresh = isStationDataFresh(station);
  const t = station.thresholds;
  return (
    <Card>
      <Text style={styles.name}>{station.name}</Text>
      <Text style={styles.muted}>
        Mã trạm: {station.nodeId}
        {station.address ? ` · ${station.address}` : ''}
      </Text>
      <Text style={styles.caption}>Độ sâu ngập trên mặt đường</Text>
      <Text style={[styles.level, !fresh && styles.levelStale, station.waterLevelCm === null && styles.levelMissing]}>
        {formatSensorValue(station.waterLevelCm, 'cm')}
      </Text>
      <Text style={styles.muted}>
        Ngưỡng: cảnh báo {t.warningCm} cm · nguy hiểm {t.dangerCm} cm · rất nguy hiểm {t.criticalCm} cm
      </Text>
      <View style={styles.badges}>
        <FloodLevelBadge level={station.floodLevel} stale={!fresh} />
        <ConnectionBadge state={station.connectionState} />
      </View>
      <LastUpdateText lastSeenAt={station.lastSeenAt} isFresh={fresh} />
      {!fresh && station.lastSeenAt ? (
        <Text style={styles.note}>Trạm đang mất kết nối nên không biết tình hình hiện tại — không có nghĩa là an toàn.</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 19, fontWeight: '800', color: appColors.text },
  muted: { color: appColors.textMuted, marginTop: 2 },
  caption: { color: appColors.textMuted, marginTop: 10, fontSize: 12, fontWeight: '700' },
  level: { fontSize: 46, fontWeight: '900', color: appColors.text },
  levelStale: { color: '#94A3B8' },
  levelMissing: { fontSize: 26, marginVertical: 8 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  note: { color: appColors.textMuted, fontSize: 12, marginTop: 6 },
});
