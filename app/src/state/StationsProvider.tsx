import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { getStationList } from '@/api/stations/getStationList';
import { STATION_REFRESH_MS } from '@/config/appConfig';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import type { Station } from '@/types/Station';
import { mergeLiveStations } from '@/utils/mergeLiveStations';

import { useRealtime } from './RealtimeProvider';

const SELECTED_KEY = 'smartflood.selectedNodeId';

interface StationsContextValue {
  /** Danh sách trạm đã gộp dữ liệu realtime mới nhất. */
  stations: Station[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Trạm đang được chọn (dùng chung cho Bản đồ và Tổng quan). */
  selectedNodeId: string | null;
  selectStation: (nodeId: string | null) => void;
  findStation: (nodeId: string) => Station | undefined;
}

const StationsContext = createContext<StationsContextValue | null>(null);

/**
 * DANH SÁCH TRẠM DÙNG CHUNG cho mọi màn hình.
 * - Tải từ máy chủ khi mở app, tự tải lại mỗi 30 giây.
 * - Gộp thêm dữ liệu realtime để bản đồ đổi màu ngay khi trạm gửi số đo mới.
 * - Nhớ trạm đang chọn trên điện thoại (mở lại app vẫn chọn trạm đó).
 */
export function StationsProvider({ children }: { children: ReactNode }) {
  const { liveStations, connected, rememberLevels } = useRealtime();
  const { data, loading, error, reload } = useAutoRefresh(() => getStationList(), [], STATION_REFRESH_MS);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (data) rememberLevels(data);
  }, [data, rememberLevels]);

  // Realtime vừa KẾT NỐI LẠI sau khi mất → tải lại toàn bộ trạm ngay (FR-06: lấy snapshot mới nhất),
  // vì trong lúc mất kết nối có thể đã bỏ lỡ nhiều gói dữ liệu.
  const everConnected = useRef(false);
  const lostConnection = useRef(false);
  useEffect(() => {
    if (!connected) {
      if (everConnected.current) lostConnection.current = true;
      return;
    }
    everConnected.current = true;
    if (lostConnection.current) {
      lostConnection.current = false;
      reload();
    }
  }, [connected, reload]);

  useEffect(() => {
    AsyncStorage.getItem(SELECTED_KEY).then(setSelectedNodeId).catch(() => {});
  }, []);

  const selectStation = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    if (nodeId) AsyncStorage.setItem(SELECTED_KEY, nodeId).catch(() => {});
  }, []);

  const stations = useMemo(() => mergeLiveStations(data ?? [], liveStations), [data, liveStations]);
  const findStation = useCallback((nodeId: string) => stations.find((s) => s.nodeId === nodeId), [stations]);

  const value = useMemo(
    () => ({ stations, loading, error, refresh: reload, selectedNodeId, selectStation, findStation }),
    [stations, loading, error, reload, selectedNodeId, selectStation, findStation],
  );
  return <StationsContext.Provider value={value}>{children}</StationsContext.Provider>;
}

export function useStations(): StationsContextValue {
  const ctx = useContext(StationsContext);
  if (!ctx) throw new Error('useStations phải được dùng bên trong <StationsProvider>');
  return ctx;
}
