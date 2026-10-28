import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { appColors } from '@/constants/appColors';

/** NÚT TRÒN NỔI trên bản đồ (vị trí của tôi, kiểm tra tuyến, tải lại...). `active` = đang bật. */
export function MapRoundButton({
  icon,
  label,
  onPress,
  active = false,
  busy = false,
}: {
  icon: string;
  /** Mô tả cho người dùng trình đọc màn hình. */
  label: string;
  onPress: () => void;
  active?: boolean;
  busy?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [styles.button, active && styles.active, pressed && { opacity: 0.7 }]}
    >
      {busy ? (
        <ActivityIndicator color={active ? '#fff' : appColors.primary} />
      ) : (
        <Text style={[styles.icon, active && { color: '#fff' }]}>{icon}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  active: { backgroundColor: appColors.primary },
  icon: { fontSize: 22, color: appColors.primary, fontWeight: '800' },
});
