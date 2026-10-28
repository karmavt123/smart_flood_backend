import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { appColors } from '@/constants/appColors';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  /** primary = nền xanh; outline = viền xanh; danger = nền đỏ. */
  variant?: 'primary' | 'outline' | 'danger';
  disabled?: boolean;
  /** Đang xử lý: hiện vòng quay và khóa nút. */
  busy?: boolean;
}

/** NÚT BẤM dùng chung toàn app. */
export function AppButton({ title, onPress, variant = 'primary', disabled, busy }: AppButtonProps) {
  const isOutline = variant === 'outline';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.primary,
        variant === 'danger' && styles.danger,
        isOutline && styles.outline,
        (pressed || disabled || busy) && styles.dimmed,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={isOutline ? appColors.primary : '#fff'} />
      ) : (
        <Text style={[styles.text, isOutline && { color: appColors.primary }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 44, paddingHorizontal: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexGrow: 1 },
  primary: { backgroundColor: appColors.primary },
  danger: { backgroundColor: appColors.danger },
  outline: { borderWidth: 1.5, borderColor: appColors.primary, backgroundColor: '#fff' },
  dimmed: { opacity: 0.6 },
  text: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
