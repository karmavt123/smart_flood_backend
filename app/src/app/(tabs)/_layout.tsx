import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';

import { appColors } from '@/constants/appColors';
import { useShowOnboardingOnce } from '@/hooks/useShowOnboardingOnce';

/** Biểu tượng tab dạng ký tự (không cần thêm thư viện icon). */
function TabIcon({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ color, fontSize: 20, fontWeight: '800' }}>{glyph}</Text>;
}

/**
 * THANH TAB DƯỚI ĐÁY: Bản đồ | Tổng quan | Cảnh báo | Trạm | Cài đặt.
 * BẢN ĐỒ là tab đầu tiên và là màn hình chính khi mở app: thấy ngay tình hình ngập quanh mình.
 * App không cần đăng nhập. Lần đầu mở app thì hiện màn Giới thiệu trước.
 */
export default function TabsLayout() {
  useShowOnboardingOnce();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: appColors.primary,
        headerTitleStyle: { fontWeight: '800' },
        sceneStyle: { backgroundColor: appColors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Bản đồ', headerShown: false, tabBarIcon: ({ color }) => <TabIcon glyph="◉" color={color} /> }}
      />
      <Tabs.Screen
        name="overview"
        options={{ title: 'Tổng quan', tabBarIcon: ({ color }) => <TabIcon glyph="⌂" color={color} /> }}
      />
      <Tabs.Screen
        name="alerts"
        options={{ title: 'Cảnh báo', tabBarIcon: ({ color }) => <TabIcon glyph="!" color={color} /> }}
      />
      <Tabs.Screen
        name="stations"
        options={{ title: 'Trạm', tabBarIcon: ({ color }) => <TabIcon glyph="≡" color={color} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Cài đặt', tabBarIcon: ({ color }) => <TabIcon glyph="⚙" color={color} /> }}
      />
    </Tabs>
  );
}
