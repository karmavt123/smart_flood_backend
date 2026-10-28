import type { ReactNode } from 'react';

import { FavoritesProvider } from './FavoritesProvider';
import { NotificationSettingsProvider } from './NotificationSettingsProvider';
import { RealtimeProvider } from './RealtimeProvider';
import { StationsProvider } from './StationsProvider';

/**
 * GỘP TẤT CẢ "KHO DỮ LIỆU DÙNG CHUNG" lại một chỗ, theo đúng thứ tự phụ thuộc:
 * Cài đặt thông báo → Trạm theo dõi → Realtime → Danh sách trạm.
 * (Kho ở trong dùng được kho ở ngoài, không dùng ngược lại.) App không còn đăng nhập.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <NotificationSettingsProvider>
      <FavoritesProvider>
        <RealtimeProvider>
          <StationsProvider>{children}</StationsProvider>
        </RealtimeProvider>
      </FavoritesProvider>
    </NotificationSettingsProvider>
  );
}
