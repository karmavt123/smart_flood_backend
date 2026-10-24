import mqtt from 'mqtt';

import { handleNodeMessage } from '../ingest/handleNodeMessage.js';
import { getNodeIdFromTopic } from './getNodeIdFromTopic.js';
import { mqttStatus } from './mqttStatus.js';

/**
 * KẾT NỐI MQTT VÀ NGHE DỮ LIỆU NODE: gateway LoRa đẩy mỗi lần đo lên topic smartflood/nodes/<mã node>/data,
 * backend nhận và đưa cho handleNodeMessage xử lý. Mất kết nối thì thư viện tự nối lại sau 5 giây.
 */
export function subscribeNodeMessages(options: { url: string; username: string; password: string; topic: string }) {
  const client = mqtt.connect(options.url, {
    username: options.username || undefined,
    password: options.password || undefined,
    clientId: 'smartflood-backend',
    reconnectPeriod: 5000,
    // clean: false + QoS 1 → backend tắt một lúc rồi bật lại vẫn nhận được tin nhắn đã lỡ (broker giữ hộ).
    clean: false,
  });
  mqttStatus.url = options.url.replace(/\/\/[^@]*@/, '//***@');

  client.on('connect', () => {
    mqttStatus.connected = true;
    console.log(`[mqtt] Đã kết nối ${mqttStatus.url}, nghe topic "${options.topic}"`);
    client.subscribe(options.topic, { qos: 1 }, (error) => {
      if (error) console.error(`[mqtt] Không đăng ký được topic: ${error.message}`);
    });
  });
  client.on('close', () => {
    if (mqttStatus.connected) console.warn('[mqtt] Mất kết nối, đang thử nối lại...');
    mqttStatus.connected = false;
  });
  client.on('error', (error) => console.error(`[mqtt] Lỗi: ${error.message}`));

  client.on('message', (topic, payload) => {
    mqttStatus.messagesReceived += 1;
    mqttStatus.lastMessageAt = new Date().toISOString();
    handleNodeMessage({ channel: 'mqtt', topic, nodeIdFromTopic: getNodeIdFromTopic(topic), payload: payload.toString('utf8') })
      .then((result) => {
        if (!result.ok) console.warn(`[mqtt] Từ chối tin nhắn ở ${topic}: ${result.reason}`);
        else if (result.newModelVersion) console.log(`[mqtt] ${result.nodeId} gửi công thức mới v${result.newModelVersion}`);
      })
      .catch((error: unknown) => console.error(`[mqtt] Lỗi khi lưu tin nhắn ở ${topic}:`, error));
  });

  return client;
}
