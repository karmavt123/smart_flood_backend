import { StyleSheet, Text, View } from 'react-native';

import { appColors } from '@/constants/appColors';
import { floodLevelStyles, STALE_STATION_COLOR } from '@/constants/floodLevelStyles';
import type { FloodLevel } from '@/types/FloodLevel';
import type { Station } from '@/types/Station';
import { isStationDataFresh } from '@/utils/isStationDataFresh';

import { Card } from '../common/Card';

const LEVELS_TO_COUNT: FloodLevel[] = ['normal', 'warning', 'danger', 'critical'];

/**
 * TÓM TẮT TOÀN HỆ THỐNG ở đầu màn Tổng quan: bao nhiêu trạm đang ở từng mức ngập,
 * bao nhiêu trạm mất kết nối. Trạm mất kết nối được đếm riêng (không tính là "an toàn").
 */
export function SystemSummaryCard({ stations }: { stations: Station[] }) {
  const fresh = stations.filter(isStationDataFresh);
  const staleCount = stations.length - fresh.length;

  return (
    <Card>
      <Text style={styles.title}>Toàn hệ thống: {stations.length} trạm</Text>
      <View style={styles.row}>
        {LEVELS_TO_COUNT.map((level) => {
          const style = floodLevelStyles[level];
          const count = fresh.filter((s) => s.floodLevel === level).length;
          return (
            <View key={level} style={styles.cell}>
              <Text style={[styles.count, { color: style.color }]}>
                {style.symbol} {count}
              </Text>
              <Text style={styles.label}>{style.label}</Text>
            </View>
          );
        })}
        <View style={styles.cell}>
          <Text style={[styles.count, { color: STALE_STATION_COLOR }]}>⏸ {staleCount}</Text>
          <Text style={styles.label}>Mất kết nối</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '800', color: appColors.text, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  cell: { alignItems: 'center', flex: 1 },
  count: { fontSize: 18, fontWeight: '900' },
  label: { fontSize: 11, color: appColors.textMuted, textAlign: 'center' },
});
