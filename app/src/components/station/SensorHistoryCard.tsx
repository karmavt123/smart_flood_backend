import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { getSensorHistory, HISTORY_MAX_POINTS } from '@/api/sensor/getSensorHistory';
import { appColors } from '@/constants/appColors';
import { historyRanges, type HistoryRangeKey } from '@/constants/historyRanges';
import { sensorMetrics, type SensorMetricKey } from '@/constants/sensorMetrics';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { saveCsvFile } from '@/utils/saveCsvFile';
import { showAlert } from '@/utils/showAlert';
import { toChartPoints } from '@/utils/toChartPoints';
import { toReadingsCsv } from '@/utils/toReadingsCsv';

import { HistoryLineChart } from '../charts/HistoryLineChart';
import { AppButton } from '../common/AppButton';
import { Card } from '../common/Card';
import { ChoiceChip } from '../common/ChoiceChip';
import { SectionTitle } from '../common/SectionTitle';

const HISTORY_REFRESH_MS = 60 * 1000;

/**
 * THẺ BIỂU ĐỒ LỊCH SỬ (FR-07): chọn 1 giờ / 24 giờ / 7 ngày và chọn thông số (mặc định độ ngập).
 * Chỉ hiện nút cho thông số trạm có gửi trong khoảng thời gian đang xem (trạm không gửi độ ẩm thì không có nút Độ ẩm).
 * Có nút "Xuất CSV" để lấy toàn bộ số đo trong khoảng đang xem ra Excel / Google Sheets.
 * Độ ngập và Dự đoán có thêm đường ngưỡng nguy hiểm nét đứt. Mỗi điểm là một lần đo thật, không gộp.
 */
export function SensorHistoryCard({ nodeId, thresholdCm }: { nodeId: string; thresholdCm: number }) {
  const [rangeKey, setRangeKey] = useState<HistoryRangeKey>('24h');
  const [metricKey, setMetricKey] = useState<SensorMetricKey>('waterLevelCm');
  const range = historyRanges.find((r) => r.key === rangeKey) ?? historyRanges[1];
  const metric = sensorMetrics.find((m) => m.key === metricKey) ?? sensorMetrics[0];

  const history = useAutoRefresh(() => getSensorHistory(nodeId, range.hours), [nodeId, range.hours], HISTORY_REFRESH_MS);
  const points = history.data ? toChartPoints(history.data, metricKey) : [];
  const [exporting, setExporting] = useState(false);

  const onExportCsv = async () => {
    if (!history.data || history.data.length === 0) return;
    setExporting(true);
    const error = await saveCsvFile(`SmartFlood_${nodeId}_${range.key}.csv`, toReadingsCsv(history.data));
    setExporting(false);
    if (error) showAlert('Chưa xuất được CSV', error);
  };

  const availableMetrics = sensorMetrics.filter(
    (m) => m.key === 'waterLevelCm' || m.key === metricKey || history.data?.some((reading) => reading[m.key] !== null),
  );

  return (
    <Card>
      <SectionTitle>Lịch sử đo</SectionTitle>
      <View style={styles.chips}>
        {historyRanges.map((r) => (
          <ChoiceChip key={r.key} label={r.label} selected={r.key === rangeKey} onPress={() => setRangeKey(r.key)} />
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {availableMetrics.map((m) => (
          <ChoiceChip key={m.key} label={m.label} selected={m.key === metricKey} onPress={() => setMetricKey(m.key)} />
        ))}
      </ScrollView>

      {history.loading && !history.data ? <Text style={styles.muted}>Đang tải lịch sử…</Text> : null}
      {history.error && !history.data ? <Text style={styles.error}>Không tải được lịch sử: {history.error}</Text> : null}
      {history.data && points.length === 0 ? (
        <Text style={styles.muted}>Không có dữ liệu {metric.label.toLowerCase()} trong {range.label} qua.</Text>
      ) : null}
      {points.length > 0 ? (
        <>
          <HistoryLineChart points={points} unit={metric.unit} digits={metric.digits} threshold={metricKey === 'waterLevelCm' || metricKey === 'predictedDepthCm' ? thresholdCm : null} />
          <Text style={styles.note}>
            {points.length} lần đo · mỗi điểm là một lần đo, không gộp · chỗ đường bị ngắt là khoảng thiếu dữ liệu.
            {history.data && history.data.length >= HISTORY_MAX_POINTS ? ` Đang hiện ${HISTORY_MAX_POINTS} lần đo mới nhất, phần cũ hơn không hiện.` : ''}
          </Text>
        </>
      ) : null}
      {history.data && history.data.length > 0 ? (
        <View style={styles.exportRow}>
          <AppButton title={`⇩ Xuất CSV (${range.label})`} variant="outline" busy={exporting} onPress={onExportCsv} />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  muted: { color: appColors.textMuted, paddingVertical: 12 },
  error: { color: appColors.danger, paddingVertical: 12 },
  note: { color: appColors.textMuted, fontSize: 11, marginTop: 6 },
  exportRow: { marginTop: 10 },
});
