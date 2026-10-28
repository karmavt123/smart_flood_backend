import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { appColors } from '@/constants/appColors';
import { floodLevelStyles, STALE_STATION_COLOR } from '@/constants/floodLevelStyles';
import type { FloodLevel } from '@/types/FloodLevel';

const LEVELS: FloodLevel[] = ['normal', 'warning', 'danger', 'critical'];

/** CHÚ GIẢI BẢN ĐỒ (FR-04): ý nghĩa màu, ký hiệu, đường tô màu và các vòng tròn. Chạm để thu gọn / mở ra. */
export function MapLegend() {
  const [open, setOpen] = useState(false);
  return (
    <Pressable onPress={() => setOpen((v) => !v)} style={styles.box} accessibilityRole="button">
      <Text style={styles.title}>{open ? 'Chú giải ▾' : 'Chú giải ▸'}</Text>
      {open ? (
        <View style={{ gap: 4, marginTop: 6 }}>
          {LEVELS.map((level) => (
            <Row key={level} color={floodLevelStyles[level].color} text={`${floodLevelStyles[level].symbol} ${floodLevelStyles[level].label}`} />
          ))}
          <Row color={STALE_STATION_COLOR} text="⏸ Mất kết nối (dữ liệu cũ)" />
          <Text style={styles.note}>Số trên nhãn = độ sâu ngập (cm). Nhãn mờ = trạm ngoài vòng 2 km.</Text>
          <Text style={styles.note}>Vòng nét đứt xanh = phạm vi 2 km quanh bạn.</Text>
          <Text style={styles.note}>Đường tô màu = đoạn đường trong vùng ảnh hưởng của trạm đang ngập (ước lượng).</Text>
          <Text style={styles.note}>Vòng tròn màu = vùng ảnh hưởng của trạm (khi chưa có hình dạng đường).</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function Row({ color, text }: { color: string; text: string }) {
  return (
    <View style={styles.row}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffffEE',
    borderRadius: 12,
    padding: 10,
    maxWidth: 260,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: appColors.border,
  },
  title: { fontWeight: '800', color: appColors.text, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  swatch: { width: 14, height: 14, borderRadius: 4 },
  text: { color: appColors.text, fontSize: 12 },
  note: { color: appColors.textMuted, fontSize: 11, marginTop: 2 },
});
