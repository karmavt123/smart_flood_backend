import { StyleSheet, Text, View } from 'react-native';

import { appColors } from '@/constants/appColors';
import { sensorMetrics } from '@/constants/sensorMetrics';
import type { SensorReading } from '@/types/SensorReading';
import { formatDateTime } from '@/utils/formatDateTime';
import { formatSensorValue } from '@/utils/formatSensorValue';

import { Card } from '../common/Card';
import { SectionTitle } from '../common/SectionTitle';

/**
 * THẺ THÔNG SỐ ĐO của lần đo mới nhất (chữ nhỏ hơn độ ngập): lượng mưa, cường độ mưa, thủy triều, nhiệt độ...
 * CHỈ HIỆN thông số trạm có gửi — trạm A01, A02 không gửi độ ẩm, ánh sáng, pin thì không có ô đó
 * (thay vì cả loạt ô "Chưa có dữ liệu" làm người xem tưởng trạm hỏng).
 */
export function SensorMetricsCard({ reading }: { reading: SensorReading | null }) {
  const shown = reading ? sensorMetrics.filter((metric) => metric.inCard && reading[metric.key] !== null) : [];

  return (
    <Card>
      <SectionTitle>Thông số đo</SectionTitle>
      {!reading ? (
        <Text style={styles.muted}>Chưa có dữ liệu</Text>
      ) : (
        <>
          {shown.length === 0 ? (
            <Text style={styles.muted}>Lần đo này trạm chỉ gửi mực nước ngập.</Text>
          ) : (
            <View style={styles.grid}>
              {shown.map((metric) => (
                <Metric
                  key={metric.key}
                  label={metric.label}
                  value={formatSensorValue(reading[metric.key], metric.unit, metric.digits)}
                />
              ))}
            </View>
          )}
          <Text style={styles.muted}>
            Lần đo: {formatDateTime(reading.timestamp)}
            {reading.rssiDbm !== null ? ` · sóng Wi-Fi ${reading.rssiDbm} dBm` : ''}
          </Text>
        </>
      )}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  metric: { flexBasis: '47%', flexGrow: 1, backgroundColor: appColors.background, borderRadius: 10, padding: 10 },
  metricLabel: { color: appColors.textMuted, fontSize: 12 },
  metricValue: { color: appColors.text, fontWeight: '800', fontSize: 16, marginTop: 4 },
  muted: { color: appColors.textMuted, fontSize: 12 },
});
