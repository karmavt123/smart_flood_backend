import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'smartflood.followedStations';

interface FavoritesContextValue {
  followedIds: string[];
  isFollowed: (nodeId: string) => boolean;
  /** Theo dõi ↔ bỏ theo dõi. */
  toggleFollow: (nodeId: string) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

/**
 * QUẢN LÝ TRẠM ĐANG THEO DÕI (FR-09). App không còn tài khoản nên danh sách lưu NGAY TRÊN MÁY
 * (AsyncStorage): mở lại app vẫn còn, nhưng đổi điện thoại thì phải chọn lại.
 * Trạm đang theo dõi được báo bằng thông báo trên điện thoại khi mức ngập tăng.
 */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [followedIds, setFollowedIds] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        const list = value ? JSON.parse(value) : [];
        if (Array.isArray(list)) setFollowedIds(list.filter((x): x is string => typeof x === 'string'));
      })
      .catch(() => {});
  }, []);

  const isFollowed = useCallback((nodeId: string) => followedIds.includes(nodeId), [followedIds]);

  const toggleFollow = useCallback(async (nodeId: string) => {
    setFollowedIds((current) => {
      const next = current.includes(nodeId) ? current.filter((id) => id !== nodeId) : [...current, nodeId];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(() => ({ followedIds, isFollowed, toggleFollow }), [followedIds, isFollowed, toggleFollow]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites phải được dùng bên trong <FavoritesProvider>');
  return ctx;
}
