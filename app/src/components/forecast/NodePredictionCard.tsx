import { StyleSheet, Text, View } from 'react-native';

import { appColors } from '@/constants/appColors';
import type { Station } from '@/types/Station';
import { formatSensorValue } from '@/utils/formatSensorValue';
import { isStationDataFresh } from '@/utils/isStationDataFresh';

import { Card } from '../common/Card';
import { SectionTitle } from '../common/SectionTitle';
import { FloodLevelBadge } from '../station/FloodLevelBadge';

/**
 * THẺ DỰ ĐOÁN NGẬP (FR-08): độ ngập TRẠM TỰ DỰ ĐOÁN sau 5 phút (bằng công thức máy chủ học rồi gửi xuống),
 * so với hiện tại đang lên hay xuống, và tính bằng phiên bản công thức nào.
 * Dữ liệu đã cũ thì ghi rõ dự đoán không còn đúng.
 * Trạm chưa có công thức nên chưa dự đoán → ghi rõ "Trạm chưa có dự đoán", không tự bịa số.
 */
export function NodePredictionCard({ station }: { station: Station }) {
  const reading = station.latest;
  const fresh = isStationDataFresh(station);
  const predicted = reading?.predictedDepthCm ?? null;

  if (!reading || predicted === null) {
    return (
      <Card>
        <SectionTitle>Dự đoán ngập</SectionTitle>
        <Text style={styles.emptyTitle}>Trạm chưa có dự đoán</Text>
        <Text style={styles.muted}>
          Trạm chỉ bắt đầu dự đoán khi máy chủ đã học được công thức từ dữ liệu lúc đường ngập của trạm này và gửi xuống
          trạm. Trong lúc chờ, app vẫn hiện số đo thực tế.
        </Text>
      </Card>
    );
  }

  const current = station.waterLevelCm ?? 0;
  const change = Math.max(0, predicted) - current;
  const trend = Math.abs(change) < 0.5 ? '→ gần như không đổi' : change > 0 ? `↑ tăng ${change.toFixed(1)} cm` : `↓ giảm ${Math.abs(change).toFixed(1)} cm`;

  return (
    <Card>
      <SectionTitle>Dự đoán {reading.forecastMinutes ?? '?'} phút tới</SectionTitle>
      <View style={styles.row}>
        <Text style={[styles.value, !fresh && styles.stale]}>{formatSensorValue(Math.max(0, predicted), 'cm')}</Text>
        <FloodLevelBadge level={station.predictedLevel} stale={!fresh} />
      </View>
      <Text style={[styles.trend, change > 0.5 && fresh && { color: appColors.danger }]}>{trend} so với hiện tại</Text>
      <Text style={styles.muted}>
        Trạm tự tính bằng công thức hồi quy{reading.modelVersion ? ` phiên bản v${reading.modelVersion}` : ''} do máy chủ
        học từ dữ liệu của chính trạm (xem mục Công thức bên dưới).
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
