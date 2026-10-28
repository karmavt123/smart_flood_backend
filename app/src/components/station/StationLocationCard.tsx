import { StyleSheet, Text } from 'react-native';

import { appColors } from '@/constants/appColors';
import type { Station } from '@/types/Station';
import { isStationDataFresh } from '@/utils/isStationDataFresh';

import { AppButton } from '../common/AppButton';
import { Card } from '../common/Card';
import { SectionTitle } from '../common/SectionTitle';

/**
 * THẺ VỊ TRÍ & VÙNG ẢNH HƯỞNG của trạm (FR-06): tọa độ, bán kính vùng ảnh hưởng, nút mở bản đồ.
 * Trạm chưa có tọa độ thì báo rõ, không đặt trạm ở vị trí mặc định.
 */
export function StationLocationCard({ station, onOpenMap }: { station: Station; onOpenMap: () => void }) {
  const hasPosition = station.latitude !== null && station.longitude !== null;
  const fresh = isStationDataFresh(station);

  return (
    <Card>
      <SectionTitle>Vị trí và vùng ảnh hưởng</SectionTitle>
      <Text style={styles.line}>
        Tọa độ: {hasPosition ? `${station.latitude?.toFixed(5)}, ${station.longitude?.toFixed(5)}` : 'chưa có vị trí'}
      </Text>
      <Text style={styles.line}>
        Bán kính ảnh hưởng:{' '}
        {!fresh ? 'không xác định (trạm mất kết nối)' : station.floodRadiusM > 0 ? `${station.floodRadiusM} m` : 'không có (trạm đang an toàn)'}
      </Text>
      <Text style={styles.note}>Bán kính là vùng đánh giá do hệ thống cấu hình theo độ ngập (cảnh báo 100 m, nguy hiểm 200 m, rất nguy hiểm 300 m), không phải ranh giới ngập đo được.</Text>
      {hasPosition ? <AppButton title="Xem trên bản đồ" variant="outline" onPress={onOpenMap} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  line: { color: appColors.text, marginBottom: 4 },
  note: { color: appColors.textMuted, fontSize: 11, marginBottom: 10 },
});
