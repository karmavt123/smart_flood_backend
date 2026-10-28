import { createServer } from 'node:net';

/**
 * BẬT 1 BROKER MQTT NHÚNG (thư viện aedes) — chỉ dùng khi chạy thử trên laptop, để không phải cài Mosquitto.
 * Không có mật khẩu, mặc định chỉ nghe ở 127.0.0.1 (máy khác trong mạng không gửi vào được).
 * Trả về địa chỉ để backend tự kết nối vào, vd "mqtt://127.0.0.1:1883".
 */
export async function startEmbeddedBroker(host: string, port: number): Promise<string> {
  const { Aedes } = await import('aedes');
  const broker = await Aedes.createBroker();
  // In ra mỗi khi 1 trạm kết nối / rớt — để biết ESP32 đã vào được broker chưa (bỏ qua chính backend).
  broker.on('clientReady', (client) => {
    if (client.id === 'smartflood-backend') return;
    const address = (client.conn as { remoteAddress?: string }).remoteAddress?.replace(/^::ffff:/, '') ?? '?';
    console.log(`[mqtt] + "${client.id}" đã kết nối vào broker (từ ${address})`);
  });
  broker.on('clientDisconnect', (client) => {
    if (client.id === 'smartflood-backend') return;
    console.log(`[mqtt] - "${client.id}" đã ngắt kết nối`);
  });
  const server = createServer(broker.handle);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve());
  });
  console.log(`[mqtt] Broker nhúng đang chạy ở mqtt://${host}:${port} (chỉ để chạy thử)`);
  return `mqtt://${host === '0.0.0.0' ? '127.0.0.1' : host}:${port}`;
}
