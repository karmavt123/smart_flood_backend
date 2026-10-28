import type { Server as HttpServer } from 'node:http';

import { Server } from 'socket.io';

import { appConfig } from '../config/appConfig.js';

/**
 * Bật Socket.IO trên cùng cổng với API (http://máy-chủ:3000/socket.io/).
 * Chỉ máy chủ gửi xuống app (station:update); app không gửi gì lên nên không cần đăng nhập.
 */
export function createRealtimeServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: appConfig.corsOrigin === '*' ? true : appConfig.corsOrigin.split(',').map((s) => s.trim()) },
  });
  io.on('connection', (socket) => {
    socket.emit('hello', { serverTime: new Date().toISOString() });
  });
  return io;
}
