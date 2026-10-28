import { Pressable, StyleSheet, Text } from 'react-native';

import { appColors } from '@/constants/appColors';

/** NÚT LỰA CHỌN dạng viên thuốc (bộ lọc, khoảng thời gian...). Nút đang chọn có nền xanh. */
export function ChoiceChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}
    >
      <Text style={[styles.text, selected && styles.selectedText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: appColors.border,
    backgroundColor: '#fff',
    marginRight: 8,
    marginBottom: 8,
  },
  selected: { backgroundColor: appColors.primary, borderColor: appColors.primary },
  text: { color: appColors.text, fontSize: 13 },
  selectedText: { color: '#fff', fontWeight: '700' },
});
