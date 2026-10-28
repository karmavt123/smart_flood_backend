import { io } from 'socket.io-client';

import { API_BASE_URL } from '@/config/appConfig';
import type { Station } from '@/types/Station';

import { toStation } from '../mappers/toStation';

interface RealtimeHandlers {
  /** Một trạm vừa có dữ liệu mới (sự kiện "station:update", máy chủ gửi nguyên cả trạm). */
  onStationUpdate: (station: Station) => void;
  /** Kết nối realtime bật/tắt. */
  onConnectionChange: (connected: boolean) => void;
}

/**
 * KẾT NỐI REALTIME với máy chủ qua Socket.IO (FR-06).
 * Máy chủ đẩy trạm ngay khi node gửi số đo mới — không cần chờ tải lại. Tự kết nối lại khi mất mạng.
 *
 * @returns hàm ngắt kết nối (gọi khi thoát app)
 */
export function connectRealtimeSocket(handlers: RealtimeHandlers): () => void {
  const socket = io(API_BASE_URL, { reconnection: true });

  socket.on('connect', () => handlers.onConnectionChange(true));
  socket.on('disconnect', () => handlers.onConnectionChange(false));
  socket.on('station:update', (raw: unknown) => {
    const station = toStation(raw);
    if (station) handlers.onStationUpdate(station);
  });

  return () => {
    socket.removeAllListeners();
    socket.disconnect();
  };
}
