import type { Server } from 'socket.io';

import type { StationDto } from '../types/StationDto.js';

let io: Server | null = null;

/** Gọi 1 lần lúc khởi động để các chỗ khác gửi được tin realtime. */
export function setRealtimeServer(server: Server) {
  io = server;
}

/**
 * ĐẨY TRẠM VỪA CẬP NHẬT tới mọi app đang mở (sự kiện "station:update" qua Socket.IO).
 * App nhận được thì thay trạm cũ bằng trạm mới ngay, không phải chờ tự tải lại.
 */
export function broadcastStationUpdate(station: StationDto) {
  io?.emit('station:update', station);
}
