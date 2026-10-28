import { Pressable, StyleSheet, Text, View } from 'react-native';

import { appColors } from '@/constants/appColors';
import { PICK_POINT_ON_MAP } from '@/constants/mapGestureText';
import type { LatLng } from '@/types/LatLng';
import type { RouteCheckResult } from '@/types/RouteCheckResult';
import type { Station } from '@/types/Station';

import { AppButton } from '../common/AppButton';
import { RouteCheckResultView } from './RouteCheckResultView';

interface RouteCheckPanelProps {
  start: LatLng | null;
  end: LatLng | null;
  result: RouteCheckResult | null;
  /** Trạm gần tuyến nhưng đang mất kết nối / chưa có dữ liệu (app tự tìm, xem findUnreliableStationsNearRoute). */
  unreliableStations: Station[];
  checking: boolean;
  error: string | null;
  locating: boolean;
  onUseMyLocation: () => void;
  onCheck: () => void;
  onReset: () => void;
  onClose: () => void;
}

/**
 * KHUNG KIỂM TRA TUYẾN ĐƯỜNG (FR-14) ở đáy bản đồ.
 * Bước 1: chọn điểm đi (chạm giữ bản đồ — trên laptop là bấm chuột phải — hoặc dùng vị trí của tôi).
 * Bước 2: chọn điểm đến cùng cách đó.
 * Bước 3: bấm "Kiểm tra" → máy chủ cho biết tuyến có đi gần vùng ngập không và gợi ý tuyến tránh.
 */
export function RouteCheckPanel(props: RouteCheckPanelProps) {
  const { start, end, result } = props;
  const step = !start
    ? `Bước 1: ${PICK_POINT_ON_MAP} để chọn ĐIỂM ĐI (A).`
    : !end
      ? `Bước 2: ${PICK_POINT_ON_MAP} để chọn ĐIỂM ĐẾN (B).`
      : null;

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>Kiểm tra tuyến đường</Text>
        <Pressable onPress={props.onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Đóng">
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>

      {step ? <Text style={styles.step}>{step}</Text> : null}
      {props.error ? <Text style={styles.error}>{props.error}</Text> : null}

      {result ? <RouteCheckResultView result={result} unreliableStations={props.unreliableStations} /> : null}

      <View style={styles.buttons}>
        {!start ? <AppButton title="Dùng vị trí của tôi" variant="outline" busy={props.locating} onPress={props.onUseMyLocation} /> : null}
        {start && end && !result ? <AppButton title="Kiểm tra tuyến" busy={props.checking} onPress={props.onCheck} /> : null}
        {start ? <AppButton title="Chọn lại" variant="outline" onPress={props.onReset} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    gap: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  title: { fontSize: 17, fontWeight: '900', color: appColors.text },
  close: { fontSize: 20, color: appColors.textMuted, fontWeight: '700' },
  step: { color: appColors.primary, fontWeight: '700' },
  error: { color: appColors.danger },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 8 },
});
