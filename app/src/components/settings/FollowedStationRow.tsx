import { Pressable, StyleSheet, Text, View } from 'react-native';

import { appColors } from '@/constants/appColors';
import { useFavorites } from '@/state/FavoritesProvider';

/** MỘT TRẠM ĐANG THEO DÕI trong màn Cài đặt (FR-09): tên trạm (chạm để mở) và nút bỏ theo dõi. */
export function FollowedStationRow({ nodeId, name, onOpen }: { nodeId: string; name: string; onOpen: () => void }) {
  const { toggleFollow } = useFavorites();
  return (
    <View style={styles.row}>
      <Pressable style={{ flex: 1 }} onPress={onOpen}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.muted}>{nodeId}</Text>
      </Pressable>
      <Pressable onPress={() => toggleFollow(nodeId)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Bỏ theo dõi">
        <Text style={styles.unfollow}>Bỏ theo dõi</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: appColors.border,
  },
  name: { color: appColors.text, fontWeight: '700' },
  muted: { color: appColors.textMuted, fontSize: 12 },
  unfollow: { color: appColors.danger, fontWeight: '700' },
});
