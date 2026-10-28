import type { MqttClient } from 'mqtt';

/**
 * GIỮ KẾT NỐI MQTT DÙNG CHUNG của backend: vừa NGHE dữ liệu trạm (subscribeNodeMessages),
 * vừa GỬI hệ số mới xuống trạm (publishNodeModel). server.ts gán vào lúc khởi động.
 */
let sharedClient: MqttClient | null = null;

export function setMqttClient(client: MqttClient) {
  sharedClient = client;
}

export function getMqttClient(): MqttClient | null {
  return sharedClient;
}
