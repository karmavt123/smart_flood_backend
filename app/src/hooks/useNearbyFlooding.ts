import { useEffect, useRef } from 'react';

import { getNearbyFlooding } from '@/api/nearby/getNearbyFlooding';
import { NEARBY_REFRESH_MS } from '@/config/appConfig';
import type { LatLng } from '@/types/LatLng';
import type { NearbyFlooding } from '@/types/NearbyFlooding';

import { useAutoRefresh } from './useAutoRefresh';

/**
 * TẢI TÌNH HÌNH NGẬP QUANH 1 VỊ TRÍ (màn Bản đồ — "Quanh bạn").
 *  - Tải lại mỗi 30 giây, và khi đổi vị trí xem.
 *  - `changeStamp` đổi (vd có dữ liệu realtime mới) → tải lại sau 1,5 giây (gộp nhiều lần đổi liên tiếp thành 1 lần gọi).
 */
export function useNearbyFlooding(center: LatLng | null, radiusM: number, changeStamp: string) {
  const result = useAutoRefresh<NearbyFlooding | null>(
    () => (center ? getNearbyFlooding(center, radiusM) : Promise.resolve(null)),
    [center?.latitude, center?.longitude, radiusM],
    NEARBY_REFRESH_MS,
  );

  const firstStamp = useRef(true);
  const { reload } = result;
  useEffect(() => {
    if (firstStamp.current) {
      firstStamp.current = false;
      return;
    }
    const timer = setTimeout(reload, 1500);
    return () => clearTimeout(timer);
  }, [changeStamp, reload]);

  return result;
}
