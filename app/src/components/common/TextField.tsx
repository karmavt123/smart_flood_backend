import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { appColors } from '@/constants/appColors';

/** Ô NHẬP CHỮ có nhãn phía trên (dùng cho đăng nhập, đăng ký, tìm kiếm). */
export function TextField({ label, ...inputProps }: { label: string } & TextInputProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor="#9AA8B4" style={styles.input} {...inputProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { color: appColors.text, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
    color: appColors.text,
  },
});
