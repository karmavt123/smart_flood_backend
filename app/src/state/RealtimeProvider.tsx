import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { connectRealtimeSocket } from '@/api/realtime/connectRealtimeSocket';
import { DEMO_MODE } from '@/config/appConfig';
import { startDemoRealtime } from '@/demo/startDemoRealtime';
import { showFloodAlertNotification } from '@/notifications/showFloodAlertNotification';
import type { FloodLevel } from '@/types/FloodLevel';
import type { RealtimeFloodEvent } from '@/types/RealtimeFloodEvent';
import type { Station } from '@/types/Station';
import { shouldRaiseFloodAlert } from '@/utils/shouldRaiseFloodAlert';
import { toFloodAlertEvent } from '@/utils/toFloodAlertEvent';

import { useFavorites } from './FavoritesProvider';
import { useNotificationSettings } from './NotificationSettingsProvider';

interface RealtimeContextValue {
  /** Đang kết nối realtime với máy chủ không. */
  connected: boolean;
  /** Bản mới nhất của từng trạm nhận qua realtime (theo mã trạm). */
  liveStations: Record<string, Station>;
  /** Các cảnh báo nhận được trong lần mở app này (mới nhất trước). */
  sessionAlerts: RealtimeFloodEvent[];
  /** Cảnh báo đang hiện trên dải đỏ đầu màn hình (null = không có). */
  bannerAlert: RealtimeFloodEvent | null;
  dismissBanner: () => void;
  /** Ghi nhớ mức ngập hiện tại của các trạm (danh sách vừa tải) để biết lần sau mức có TĂNG không. */
  rememberLevels: (stations: Station[]) => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

/**
 * NHẬN DỮ LIỆU REALTIME (FR-06, FR-10).
 * - Kết nối Socket.IO tới máy chủ ngay khi mở app (chế độ demo thì dùng giả lập).
 * - Trạm nào TĂNG mức ngập: hiện dải đỏ trong app; nếu là trạm ĐANG THEO DÕI và đã bật thông báo
 *   thì hiện thêm thông báo trên điện thoại.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { isFollowed } = useFavorites();
  const { phoneAlertsEnabled } = useNotificationSettings();
  const [connected, setConnected] = useState(false);
  const [liveStations, setLiveStations] = useState<Record<string, Station>>({});
  const [sessionAlerts, setSessionAlerts] = useState<RealtimeFloodEvent[]>([]);
  const [bannerAlert, setBannerAlert] = useState<RealtimeFloodEvent | null>(null);

  // Dùng ref để hàm nhận dữ liệu luôn đọc giá trị mới nhất mà không phải kết nối lại.
  const isFollowedRef = useRef(isFollowed);
  isFollowedRef.current = isFollowed;
  const phoneAlertsRef = useRef(phoneAlertsEnabled);
  phoneAlertsRef.current = phoneAlertsEnabled;
  const lastLevels = useRef(new Map<string, FloodLevel>());

  useEffect(() => {
    const handlers = {
      onConnectionChange: setConnected,
      onStationUpdate: (station: Station) => {
        setLiveStations((prev) => ({ ...prev, [station.nodeId]: station }));
        const previous = lastLevels.current.get(station.nodeId);
        lastLevels.current.set(station.nodeId, station.floodLevel);
        if (!shouldRaiseFloodAlert(previous, station)) return;
        const event = toFloodAlertEvent(station);
        setSessionAlerts((prev) => [event, ...prev].slice(0, 50));
        setBannerAlert(event);
        if (phoneAlertsRef.current && isFollowedRef.current(station.nodeId)) {
          showFloodAlertNotification(event).catch(() => {});
        }
      },
    };
    const stop = DEMO_MODE ? startDemoRealtime(handlers) : connectRealtimeSocket(handlers);
    return () => {
      stop();
      setConnected(false);
    };
  }, []);

  const dismissBanner = useCallback(() => setBannerAlert(null), []);
  const rememberLevels = useCallback((stations: Station[]) => {
    for (const s of stations) if (!lastLevels.current.has(s.nodeId)) lastLevels.current.set(s.nodeId, s.floodLevel);
  }, []);

  const value = useMemo(
    () => ({ connected, liveStations, sessionAlerts, bannerAlert, dismissBanner, rememberLevels }),
    [connected, liveStations, sessionAlerts, bannerAlert, dismissBanner, rememberLevels],
  );
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime phải được dùng bên trong <RealtimeProvider>');
  return ctx;
}
