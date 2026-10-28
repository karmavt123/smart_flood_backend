import { router } from 'expo-router';

/**
 * MỞ TAB BẢN ĐỒ VÀ BAY TỚI MỘT TRẠM.
 * Gửi kèm `at` (thời điểm bấm) để bấm lại cùng một trạm lần nữa bản đồ vẫn bay tới.
 */
export function openStationOnMap(nodeId: string) {
  router.navigate({ pathname: '/', params: { focus: nodeId, at: String(Date.now()) } });
}
