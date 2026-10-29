import { StyleSheet, Text, View } from 'react-native';

import { appColors } from '@/constants/appColors';
import type { Station } from '@/types/Station';
import { formatSensorValue } from '@/utils/formatSensorValue';
import { getWaterTrend, WATER_TREND_TEXT } from '@/utils/getWaterTrend';
import { isStationDataFresh } from '@/utils/isStationDataFresh';

const TREND_COLOR = { rising: appColors.danger, falling: '#15803D', steady: appColors.textMuted } as const;

/**
 * Ô "SAU 5 PHÚT" đặt cạnh độ ngập hiện tại: độ ngập TRẠM DỰ BÁO (predicted_water_level_mm trạm gửi).
 * Trạm chưa gửi dự báo, hoặc dữ liệu đã cũ (mất kết nối) → ghi "Chưa có thông tin", không đoán.
 */
export function ForecastBox({ station, size = 'large' }: { station: Station; size?: 'large' | 'small' }) {
  const latest = station.latest;
  const predicted = isStationDataFresh(station) ? (latest?.predictedDepthCm ?? null) : null;
  const trend = predicted === null ? null : getWaterTrend(latest);
  const minutes = latest?.forecastMinutes ?? 5;
  return (
    <View style={styles.box} accessibilityLabel={`Độ ngập sau ${minutes} phút`}>
      <Text style={styles.caption}>Sau {minutes} phút</Text>
      {predicted === null ? (
        <Text style={styles.missing}>Chưa có thông tin</Text>
      ) : (
        <>
          <Text style={[styles.value, size === 'small' && styles.valueSmall]}>
            {formatSensorValue(Math.max(0, predicted), 'cm')}
          </Text>
          {trend ? <Text style={[styles.trend, { color: TREND_COLOR[trend] }]}>{WATER_TREND_TEXT[trend]}</Text> : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    minWidth: 112,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'flex-start',
  },
  caption: { color: appColors.textMuted, fontSize: 12, fontWeight: '700' },
  value: { fontSize: 26, fontWeight: '900', color: appColors.text },
  valueSmall: { fontSize: 22 },
  missing: { fontSize: 14, fontWeight: '700', color: appColors.textMuted, marginTop: 4 },
  trend: { fontSize: 12, fontWeight: '800' },
});
