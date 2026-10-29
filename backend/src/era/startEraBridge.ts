import { randomBytes } from 'node:crypto';

import mqtt from 'mqtt';

import { handleNodeMessage } from '../ingest/handleNodeMessage.js';
import { createEraCollector, type EraReadingFields } from './createEraCollector.js';
import { eraStatus } from './eraStatus.js';
import type { EraFieldRule } from './parseEraFieldMap.js';
import { readEraValues } from './readEraValues.js';

export interface EraBridgeOptions {
  /** Broker E-Ra, mặc định mqtt://mqtt1.eoh.io:1883. */
  url: string;
  /** Token của gateway E-Ra (dùng làm cả username lẫn password, giống thiết bị). */
  token: string;
  /** Mã trạm bên SmartFlood. */
  nodeId: string;
  rules: EraFieldRule[];
  saveIntervalSec: number;
}

/**
 * CẦU NỐI E-RA → SMARTFLOOD: máy chủ tự kết nối vào broker của nền tảng E-Ra (EoH), nghe toàn bộ tin của
 * 1 gateway (topic eoh/chip/<token>/#), lấy các số đo, gom thành 1 lần đo rồi lưu như tin của 1 trạm bình thường
 * (đi qua cùng handleNodeMessage: kiểm tra, lưu DB, đẩy realtime cho app).
 *
 * Lưu ý:
 *   - Client ID ngẫu nhiên, KHÁC thiết bị → không đá thiết bị rớt mạng. Chạy cùng lúc trên laptop và máy chủ cũng được.
 *   - Bỏ qua tin "retained" (giá trị cũ broker giữ lại, tới ngay lúc vừa kết nối) → không lưu trùng số đo cũ.
 *   - Token là bí mật: mọi log đều che token thành ***.
 *   - Chiều ngược lại (gửi hệ số công thức xuống trạm E-Ra) CHƯA làm.
 * Trả về hàm dừng cầu nối (gọi khi tắt backend).
 */
export function startEraBridge(options: EraBridgeOptions): () => void {
  const prefix = `eoh/chip/${options.token}`;
  const mask = (text: string) => text.split(options.token).join('***');
  const shortToken = `…${options.token.slice(-4)}`;
  const reportedEmptyTopics = new Set<string>();
  let reportedRetained = false;

  eraStatus.enabled = true;
  eraStatus.nodeId = options.nodeId;

  const collector = createEraCollector({
    rules: options.rules,
    saveIntervalSec: options.saveIntervalSec,
    onReading: (fields) => void saveReading(fields),
    onMissingWaterLevel: () =>
      console.warn(`[era] Có dữ liệu nhưng chưa có độ ngập (trường nào đổ vào water_level_mm?) → chưa lưu được.`),
  });

  const client = mqtt.connect(options.url, {
    username: options.token,
    password: options.token,
    clientId: `smartflood-era-${randomBytes(3).toString('hex')}`,
    clean: true,
    reconnectPeriod: 10_000,
    connectTimeout: 15_000,
  });

  client.on('connect', () => {
    eraStatus.connected = true;
    eraStatus.lastError = null;
    console.log(`[era] Đã kết nối ${options.url}, nghe gateway ${shortToken} → trạm ${options.nodeId}`);
    client.subscribe(`${prefix}/#`, { qos: 0 }, (error, granted) => {
      if (error) console.error(`[era] Không đăng ký nghe được: ${mask(error.message)}`);
      else if (granted?.some((grant) => grant.qos === 128)) {
        console.error('[era] E-Ra TỪ CHỐI cho đọc dữ liệu của gateway này. Kiểm tra lại ERA_GATEWAY_TOKEN.');
      }
    });
  });
  client.on('close', () => {
    if (eraStatus.connected) console.warn('[era] Mất kết nối E-Ra, 10 giây nữa thử nối lại...');
    eraStatus.connected = false;
  });
  client.on('error', (error) => {
    const message = mask(error.message);
    if (message === eraStatus.lastError) return; // cùng 1 lỗi lặp lại mỗi lần thử nối → chỉ in 1 lần
    eraStatus.lastError = message;
    const hint = /not authori[sz]ed|bad user/i.test(message) ? ' (sai token gateway?)' : '';
    console.error(`[era] Lỗi kết nối E-Ra: ${message}${hint}`);
  });

  client.on('message', (topic, payload, packet) => {
    eraStatus.messagesReceived += 1;
    eraStatus.lastMessageAt = new Date().toISOString();
    if (packet.retain) {
      if (!reportedRetained) console.log('[era] Bỏ qua các giá trị cũ broker E-Ra còn giữ lại, chỉ lấy số đo mới từ giờ.');
      reportedRetained = true;
      return;
    }
    if (!topic.startsWith(prefix)) return;
    const subTopic = topic.slice(prefix.length);
    const values = readEraValues(subTopic, payload.toString('utf8'));
    if (values === null) return; // is_online, down... không chứa số đo
    if (values.length === 0) {
      const pattern = subTopic.replace(/\/\d+\//g, '/<id>/');
      if (!reportedEmptyTopics.has(pattern)) console.warn(`[era] Tin ở ${mask(topic)} không có số nào đọc được: ${payload.toString('utf8').slice(0, 200)}`);
      reportedEmptyTopics.add(pattern);
      return;
    }
    for (const item of collector.push(values)) {
      console.log(`[era] Thấy trường "${item.key}" (= ${item.value}) nhưng ERA_FIELD_MAP chưa khai báo → bỏ qua`);
    }
  });

  async function saveReading(fields: EraReadingFields) {
    try {
      const result = await handleNodeMessage({
        channel: 'mqtt',
        topic: `e-ra/${options.nodeId}`,
        nodeIdFromTopic: options.nodeId,
        payload: { id: options.nodeId, ...fields, via: 'e-ra' },
        requireDrain: false, // E-Ra chưa có trường V; khai báo drain_mm_5min trong ERA_FIELD_MAP thì vẫn lưu
      });
      if (!result.ok) {
        console.warn(`[era] Từ chối số đo của ${options.nodeId}: ${result.reason}`);
        return;
      }
      eraStatus.readingsSaved += 1;
      eraStatus.lastReadingAt = new Date().toISOString();
      console.log(`[era] Đã lưu số đo của ${options.nodeId}: ${describeFields(fields)}`);
    } catch (error) {
      console.error(`[era] Lỗi khi lưu số đo của ${options.nodeId}:`, error);
    }
  }

  return () => {
    collector.stop();
    client.end(true);
  };
}

/** {water_level_mm: 120, rain_mm: 3} → "ngập 120 mm, mưa 3 mm" để in log dễ đọc. */
function describeFields(fields: EraReadingFields): string {
  const parts: string[] = [];
  if (fields.water_level_mm !== undefined) parts.push(`ngập ${fields.water_level_mm} mm`);
  if (fields.rise_rate_mm_min !== undefined) parts.push(`dâng ${fields.rise_rate_mm_min} mm/phút`);
  if (fields.drain_mm_5min !== undefined) parts.push(`thoát ${fields.drain_mm_5min} mm/5 phút`);
  if (fields.rain_mm !== undefined) parts.push(`mưa ${fields.rain_mm} mm`);
  if (fields.tide_m !== undefined) parts.push(`triều ${fields.tide_m} m`);
  return parts.join(', ');
}
