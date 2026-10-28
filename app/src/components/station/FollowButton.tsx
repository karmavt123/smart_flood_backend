import { useState } from 'react';
import { useFavorites } from '@/state/FavoritesProvider';
import { showAlert } from '@/utils/showAlert';

import { AppButton } from '../common/AppButton';

/**
 * NÚT THEO DÕI / BỎ THEO DÕI một trạm (FR-09). Danh sách theo dõi lưu ngay trên máy.
 * Trạm đang theo dõi tăng mức ngập thì app hiện thông báo (nếu đã bật trong Cài đặt).
 */
export function FollowButton({ nodeId }: { nodeId: string }) {
  const { isFollowed, toggleFollow } = useFavorites();
  const [busy, setBusy] = useState(false);
  const followed = isFollowed(nodeId);

  const onPress = async () => {
    setBusy(true);
    try {
      await toggleFollow(nodeId);
    } catch (e) {
      showAlert('Không cập nhật được', e instanceof Error ? e.message : 'Lỗi không xác định');
    } finally {
      setBusy(false);
    }
  };

  return <AppButton title={followed ? '★ Đang theo dõi' : '☆ Theo dõi'} variant="outline" busy={busy} onPress={onPress} />;
}
