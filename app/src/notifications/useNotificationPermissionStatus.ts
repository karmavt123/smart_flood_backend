import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unsupported';

/** Chữ hiển thị cho từng trạng thái quyền. */
export const notificationPermissionLabels: Record<NotificationPermissionStatus, string> = {
  granted: 'Đã cho phép',
  denied: 'Đã bị từ chối — mở Cài đặt điện thoại để bật lại',
  undetermined: 'Chưa hỏi',
  unsupported: 'Không hỗ trợ trên nền tảng này',
};

/**
 * ĐỌC TRẠNG THÁI QUYỀN THÔNG BÁO CỦA HỆ ĐIỀU HÀNH (FR-12).
 * Tự đọc lại mỗi khi người dùng quay lại app (ví dụ vừa vào Cài đặt bật quyền).
 */
export function useNotificationPermissionStatus() {
  const [status, setStatus] = useState<NotificationPermissionStatus>(Platform.OS === 'web' ? 'unsupported' : 'undetermined');

  const refresh = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      const result = await Notifications.getPermissionsAsync();
      setStatus(result.granted ? 'granted' : result.canAskAgain ? 'undetermined' : 'denied');
    } catch {
      setStatus('unsupported');
    }
  }, []);

  useEffect(() => {
    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  return { status, refresh };
}
