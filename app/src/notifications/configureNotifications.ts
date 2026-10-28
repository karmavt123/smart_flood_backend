import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/** Tên "kênh" thông báo cảnh báo ngập trên Android. */
export const FLOOD_ALERT_CHANNEL_ID = 'flood-alerts';

/**
 * CẤU HÌNH THÔNG BÁO — gọi 1 lần khi mở app.
 * - Cho phép hiện thông báo cả khi app đang mở.
 * - Android: tạo kênh "Cảnh báo ngập" mức ưu tiên cao (có âm thanh, hiện popup).
 */
export async function configureNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(FLOOD_ALERT_CHANNEL_ID, {
      name: 'Cảnh báo ngập',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}
