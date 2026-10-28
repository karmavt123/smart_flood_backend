import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { openStationDetail } from '@/navigation/openStationDetail';

function openStation(response: Notifications.NotificationResponse | null) {
  const nodeId = response?.notification.request.content.data?.nodeId;
  if (typeof nodeId === 'string') openStationDetail(nodeId);
}

/**
 * CHẠM VÀO THÔNG BÁO → MỞ ĐÚNG TRẠM (FR-10).
 * Xử lý cả 2 trường hợp: app đang chạy, và app được mở lên từ thông báo.
 */
export function useOpenStationFromNotification() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    Notifications.getLastNotificationResponseAsync().then(openStation).catch(() => {});
    const subscription = Notifications.addNotificationResponseReceivedListener(openStation);
    return () => subscription.remove();
  }, []);
}
