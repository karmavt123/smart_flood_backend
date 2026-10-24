import { createServer } from 'node:http';

import { appConfig } from './config/appConfig.js';
import { resolveAdminKey } from './config/resolveAdminKey.js';
import { createDatabase } from './db/createDatabase.js';
import { runMigrations } from './db/runMigrations.js';
import { setDatabase } from './db/sharedDatabase.js';
import { createHttpApp } from './http/createHttpApp.js';
import { startEmbeddedBroker } from './mqtt/startEmbeddedBroker.js';
import { subscribeNodeMessages } from './mqtt/subscribeNodeMessages.js';
import { createRealtimeServer } from './realtime/createRealtimeServer.js';
import { setRealtimeServer } from './realtime/realtimeHub.js';

/**
 * ĐIỂM KHỞI ĐỘNG BACKEND (npm run dev / npm start), làm theo thứ tự:
 *   1. Kết nối DB (PostgreSQL thật hoặc nhúng) và tạo bảng nếu chưa có
 *   2. Bật API + trang admin + realtime trên cùng 1 cổng (mặc định 3000)
 *   3. Kết nối MQTT (broker thật hoặc broker nhúng) và bắt đầu nhận dữ liệu node
 */
async function main() {
  const adminKey = resolveAdminKey();

  const database = await createDatabase();
  setDatabase(database);
  await runMigrations(database);
  console.log(`[db] Đang dùng ${database.kind === 'postgres' ? 'PostgreSQL' : `PostgreSQL nhúng (${appConfig.embeddedDbDir})`}`);

  const httpServer = createServer(createHttpApp(adminKey));
  setRealtimeServer(createRealtimeServer(httpServer));
  await new Promise<void>((resolve) => httpServer.listen(appConfig.port, resolve));
  console.log(`[http] API:   http://localhost:${appConfig.port}/api/v1/stations`);
  console.log(`[http] Admin: http://localhost:${appConfig.port}/admin`);

  const mqttUrl = appConfig.mqttUrl || (await startEmbeddedBroker(appConfig.embeddedMqttHost, appConfig.embeddedMqttPort));
  const mqttClient = subscribeNodeMessages({
    url: mqttUrl,
    username: appConfig.mqttUsername,
    password: appConfig.mqttPassword,
    topic: appConfig.mqttTopic,
  });

  // Tắt gọn gàng khi bấm Ctrl+C hoặc Docker dừng container (để DB nhúng không bị hỏng).
  const shutdown = async () => {
    console.log('Đang tắt backend...');
    mqttClient.end(true);
    httpServer.close();
    await database.close();
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

main().catch((error: unknown) => {
  console.error('Không khởi động được backend:', error);
  process.exit(1);
});
