import { router } from 'expo-router';

/** MỞ MÀN HÌNH CHI TIẾT của một trạm (dùng ở Bản đồ, Tổng quan, Trạm, Cảnh báo, Cài đặt). */
export function openStationDetail(nodeId: string) {
  router.push({ pathname: '/station/[nodeId]', params: { nodeId } });
}
