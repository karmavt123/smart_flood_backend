import * as Location from 'expo-location';
import { useCallback, useState } from 'react';

import type { LatLng } from '@/types/LatLng';
import { describeLocationError, LOCATION_TIMEOUT_CODE } from '@/utils/describeLocationError';

type LocationStatus = 'idle' | 'loading' | 'ready' | 'denied' | 'error';

/** Kết quả 1 lần lấy vị trí: có vị trí, hoặc câu giải thích vì sao không lấy được. */
export interface LocationResult {
  position: LatLng | null;
  error: string | null;
}

/** Quá 15 giây chưa lấy được vị trí thì thôi (laptop không có GPS có thể chờ rất lâu). */
const LOCATION_TIMEOUT_MS = 15000;

/**
 * LẤY VỊ TRÍ HIỆN TẠI CỦA ĐIỆN THOẠI / LAPTOP (FR-13).
 * Không lấy được thì trả về câu giải thích rõ lý do (bị chặn quyền, tắt định vị, quá lâu),
 * để người dùng biết phải làm gì. Từ chối quyền thì app vẫn dùng bình thường.
 */
export function useCurrentLocation() {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [status, setStatus] = useState<LocationStatus>('idle');

  const requestLocation = useCallback(async (): Promise<LocationResult> => {
    setStatus('loading');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setStatus('denied');
        return { position: null, error: describeLocationError({ code: 'DENIED' }) };
      }
      const result = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject({ code: LOCATION_TIMEOUT_CODE }), LOCATION_TIMEOUT_MS),
        ),
      ]);
      const next = { latitude: result.coords.latitude, longitude: result.coords.longitude };
      setPosition(next);
      setStatus('ready');
      return { position: next, error: null };
    } catch (error) {
      setStatus('error');
      return { position: null, error: describeLocationError(error) };
    }
  }, []);

  return { position, status, requestLocation };
}
