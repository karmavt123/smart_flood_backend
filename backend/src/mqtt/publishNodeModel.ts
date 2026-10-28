import { modelTopic } from '../config/modelRules.js';
import { markModelPublished } from '../repositories/models/markModelPublished.js';
import type { NodeModelRecord } from '../types/NodeModelRecord.js';
import { getMqttClient } from './mqttClientHub.js';
import { toModelMessage } from './toModelMessage.js';

const ACK_TIMEOUT_MS = 10_000;

/**
 * GỬI HỆ SỐ MỚI XUỐNG TRẠM qua MQTT, topic smartflood/nodes/<id>/model:
 *   - QoS 1: broker phải xác nhận đã nhận.
 *   - retain: broker GIỮ tin cuối cùng của topic, trạm đang tắt / mất Wi-Fi thì lúc nối lại vẫn nhận được.
 * Trả về true nếu broker đã nhận; false nếu MQTT đang mất kết nối (lúc nối lại backend sẽ tự gửi lại).
 */
export async function publishNodeModel(model: NodeModelRecord): Promise<boolean> {
  const client = getMqttClient();
  if (!client || !client.connected) return false;
  const topic = modelTopic(model.node_id);
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('broker không xác nhận sau 10 giây')), ACK_TIMEOUT_MS);
      client.publish(topic, JSON.stringify(toModelMessage(model)), { qos: 1, retain: true }, (error) => {
        clearTimeout(timer);
        if (error) reject(error);
        else resolve();
      });
    });
  } catch (error) {
    console.warn(`[mqtt] Chưa gửi được công thức v${model.version} xuống ${model.node_id}: ${(error as Error).message}`);
    return false;
  }
  await markModelPublished(model.node_id, model.version, new Date());
  console.log(`[mqtt] Đã gửi công thức v${model.version} xuống ${topic}`);
  return true;
}
