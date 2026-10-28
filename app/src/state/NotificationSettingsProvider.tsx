import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { requestNotificationPermission } from '@/notifications/requestNotificationPermission';

const STORAGE_KEY = 'smartflood.phoneAlertsEnabled';

interface NotificationSettingsValue {
  /** Có hiện thông báo trên điện thoại khi trạm đang theo dõi vượt ngưỡng không. */
  phoneAlertsEnabled: boolean;
  /** Bật/tắt. Khi bật sẽ xin quyền; bị từ chối thì trả false. */
  setPhoneAlertsEnabled: (enabled: boolean) => Promise<boolean>;
}

const NotificationSettingsContext = createContext<NotificationSettingsValue | null>(null);

/**
 * CÀI ĐẶT THÔNG BÁO TRÊN ĐIỆN THOẠI (FR-12). Lưu trên máy (AsyncStorage) vì đây là cài đặt của riêng thiết bị.
 * Mặc định TẮT; người dùng bật trong màn Cài đặt thì app mới xin quyền.
 */
export function NotificationSettingsProvider({ children }: { children: ReactNode }) {
  const [phoneAlertsEnabled, setEnabled] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => setEnabled(value === 'true'))
      .catch(() => {});
  }, []);

  const setPhoneAlertsEnabled = useCallback(async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestNotificationPermission().catch(() => false);
      if (!granted) return false;
    }
    setEnabled(enabled);
    AsyncStorage.setItem(STORAGE_KEY, String(enabled)).catch(() => {});
    return true;
  }, []);

  const value = useMemo(() => ({ phoneAlertsEnabled, setPhoneAlertsEnabled }), [phoneAlertsEnabled, setPhoneAlertsEnabled]);
  return <NotificationSettingsContext.Provider value={value}>{children}</NotificationSettingsContext.Provider>;
}

export function useNotificationSettings(): NotificationSettingsValue {
  const ctx = useContext(NotificationSettingsContext);
  if (!ctx) throw new Error('useNotificationSettings phải được dùng bên trong <NotificationSettingsProvider>');
  return ctx;
}
