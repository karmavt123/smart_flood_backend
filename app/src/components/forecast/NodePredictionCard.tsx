import { StyleSheet, Text, View } from 'react-native';

import { appColors } from '@/constants/appColors';
import type { Station } from '@/types/Station';
import { formatSensorValue } from '@/utils/formatSensorValue';
import { getWaterTrend, WATER_TREND_TEXT } from '@/utils/getWaterTrend';
import { isStationDataFresh } from '@/utils/isStationDataFresh';

import { Card } from '../common/Card';
import { SectionTitle } from '../common/SectionTitle';
import { FloodLevelBadge } from '../station/FloodLevelBadge';

/**
 * THẺ DỰ ĐOÁN NGẬP (FR-08): độ ngập sau 5 phút TRẠM GỬI LÊN (predicted_water_level_mm, gói tin 3.1 — trạm tự tính,
 * app chỉ hiển thị), so với hiện tại: Đang dâng / Đang rút / Ổn định (±2 mm, giống ô "Sau 5 phút").
 * Dữ liệu đã cũ thì ghi rõ dự đoán không còn đúng.
 * Trạm chưa gửi dự báo → ghi "Chưa có thông tin", không tự bịa số.
 */
export function NodePredictionCard({ station }: { station: Station }) {
  const reading = station.latest;
  const fresh = isStationDataFresh(station);
  const predicted = reading?.predictedDepthCm ?? null;

  if (!reading || predicted === null) {
    return (
      <Card>
        <SectionTitle>Dự đoán ngập</SectionTitle>
        <Text style={styles.emptyTitle}>Chưa có thông tin</Text>
        <Text style={styles.muted}>
          Trạm chưa gửi độ ngập dự báo sau 5 phút. App không tự đoán; trong lúc chờ vẫn hiện số đo thực tế.
        </Text>
      </Card>
    );
  }

  const current = station.waterLevelCm ?? 0;
  const change = Math.max(0, predicted) - current;
  const waterTrend = getWaterTrend(reading);
  const trend =
    waterTrend === 'rising'
      ? `↑ ${WATER_TREND_TEXT.rising}: tăng ${change.toFixed(1)} cm`
      : waterTrend === 'falling'
        ? `↓ ${WATER_TREND_TEXT.falling}: giảm ${Math.abs(change).toFixed(1)} cm`
        : `→ ${WATER_TREND_TEXT.steady}`;

  return (
    <Card>
      <SectionTitle>Dự đoán {reading.forecastMinutes ?? '?'} phút tới</SectionTitle>
      <View style={styles.row}>
        <Text style={[styles.value, !fresh && styles.stale]}>{formatSensorValue(Math.max(0, predicted), 'cm')}</Text>
        <FloodLevelBadge level={station.predictedLevel} stale={!fresh} />
      </View>
      <Text style={[styles.trend, waterTrend === 'rising' && fresh && { color: appColors.danger }]}>{trend} so với hiện tại</Text>
      <Text style={styles.muted}>
        Số do trạm tự tính và gửi lên, app chỉ hiển thị.
        {reading.modelVersion ? ` Trạm báo đang dùng công thức v${reading.modelVersion} (xem mục Công thức bên dưới).` : ''}
      </Text>
      {!fresh ? <Text style={styles.note}>Dữ liệu của trạm đã cũ nên dự đoán này không còn đúng.</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  value: { fontSize: 32, fontWeight: '900', color: appColors.text },
  stale: { color: '#94A3B8' },
  trend: { color: appColors.text, fontWeight: '700', marginTop: 4 },
  muted: { color: appColors.textMuted, fontSize: 12, marginTop: 4 },
  emptyTitle: { color: appColors.text, fontWeight: '700' },
  note: { color: appColors.danger, fontSize: 12, marginTop: 4 },
});
