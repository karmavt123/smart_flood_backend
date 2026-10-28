import { toStation } from '@/api/mappers/toStation';
import type { Station } from '@/types/Station';

import { buildDemoStation, demoStationSeeds } from './demoStations';

interface DemoRealtimeHandlers {
  onStationUpdate: (station: Station) => void;
  onConnectionChange: (connected: boolean) => void;
}

/**
 * GIẢ LẬP REALTIME cho chế độ DEMO (thay cho Socket.IO):
 *   - mỗi 10 giây, trạm demo đầu tiên gửi một số đo mới (độ ngập dao động nhẹ);
 *   - sau 15 giây, trạm Bình Thạnh tăng từ An toàn lên Cảnh báo → app hiện cảnh báo để trình diễn.
 * @returns hàm dừng giả lập.
 */
export function startDemoRealtime(handlers: DemoRealtimeHandlers): () => void {
  const emit = (index: number, depth: number) => {
    const seed = demoStationSeeds[index];
    if (!seed) return;
    const station = toStation(buildDemoStation(seed, Date.now(), Math.round(depth * 10) / 10));
    if (station) handlers.onStationUpdate(station);
  };

  handlers.onConnectionChange(true);
  let tick = 0;
  const dataTimer = setInterval(() => {
    tick += 1;
    emit(0, 43.5 + Math.sin(tick / 2) * 1.5);
  }, 10000);
  const alertTimer = setTimeout(() => emit(3, 14.2), 15000);

  return () => {
    clearInterval(dataTimer);
    clearTimeout(alertTimer);
    handlers.onConnectionChange(false);
  };
}
