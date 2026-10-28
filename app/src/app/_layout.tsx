import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';

import { RealtimeAlertBanner } from '@/components/alerts/RealtimeAlertBanner';
import { WebPhoneFrame } from '@/components/common/WebPhoneFrame';
import { appColors } from '@/constants/appColors';
import { configureNotifications } from '@/notifications/configureNotifications';
import { useOpenStationFromNotification } from '@/notifications/useOpenStationFromNotification';
import { AppProviders } from '@/state/AppProviders';

/**
 * KHUNG GỐC CỦA APP (mọi màn hình nằm bên trong).
 * - Bọc các "kho dữ liệu dùng chung" (AppProviders).
 * - Cấu hình thông báo, xử lý chạm vào thông báo.
 * - Khai báo các màn hình dạng chồng lớp (Stack): nhóm tab, giới thiệu, chi tiết trạm.
 * - Dải cảnh báo đỏ realtime luôn nằm trên cùng.
 * - Chạy trên laptop thì app nằm trong khung rộng như điện thoại (WebPhoneFrame).
 */
export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS !== 'web') configureNotifications().catch(() => {});
  }, []);
  useOpenStationFromNotification();

  return (
    <AppProviders>
      <StatusBar style="dark" />
      <WebPhoneFrame>
        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ contentStyle: { backgroundColor: appColors.background }, headerBackTitle: 'Quay lại' }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="station/[nodeId]" options={{ title: 'Chi tiết trạm' }} />
          </Stack>
          <RealtimeAlertBanner />
        </View>
      </WebPhoneFrame>
    </AppProviders>
  );
}
