import { describeSchemaIssues } from './describeSchemaIssues.js';
import { IngestRejection } from './IngestRejection.js';
import { KNOWN_MESSAGE_KEYS, nodeMessageSchema } from './nodeMessageSchema.js';
import type { ParsedNodeMessage } from './ParsedNodeMessage.js';
import { parseTimeValue } from './parseTimeValue.js';
import { resolveMeasuredAt } from './resolveMeasuredAt.js';

const MAX_EXTRA_JSON_LENGTH = 2000;

interface ParseOptions {
  /** Mã node lấy từ topic MQTT (smartflood/nodes/<mã node>/data); null nếu không có topic. */
  nodeIdFromTopic: string | null;
  receivedAt: Date;
  /** true khi nhập dữ liệu cũ: bắt buộc có measured_at. */
  mustHaveDeviceTime: boolean;
}

/**
 * KIỂM TRA + CHUẨN HÓA 1 tin nhắn (đã là object JSON).
 * Sai ở đâu thì ném IngestRejection kèm lý do tiếng Việt, ví dụ "tide_cm: thiếu trường bắt buộc".
 */
export function parseNodeMessage(input: unknown, options: ParseOptions): ParsedNodeMessage {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new IngestRejection('Tin nhắn phải là 1 object JSON dạng { ... }');
  }
  const result = nodeMessageSchema.safeParse(input);
  if (!result.success) throw new IngestRejection(describeSchemaIssues(result.error, input));
  const message = result.data;

  // Mã node: lấy trong tin nhắn hoặc trong topic; có cả 2 thì phải giống nhau.
  const nodeId = message.node_id ?? options.nodeIdFromTopic;
  if (!nodeId) throw new IngestRejection('node_id: thiếu mã node (ghi trong tin nhắn hoặc trong topic)');
  if (message.node_id && options.nodeIdFromTopic && message.node_id !== options.nodeIdFromTopic) {
    throw new IngestRejection(`node_id "${message.node_id}" khác mã node trong topic "${options.nodeIdFromTopic}"`);
  }

  const time = resolveMeasuredAt(message.measured_at, options.receivedAt, options.mustHaveDeviceTime);

  // Gom các trường lạ vào extra (giới hạn độ dài để 1 node lỗi không làm phình DB).
  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!KNOWN_MESSAGE_KEYS.has(key)) extra[key] = value;
  }
  if (time.rejectedDeviceTime !== null) extra.device_measured_at_rejected = time.rejectedDeviceTime;
  if (JSON.stringify(extra).length > MAX_EXTRA_JSON_LENGTH) {
    throw new IngestRejection(`Các trường thêm quá dài (tối đa ${MAX_EXTRA_JSON_LENGTH} ký tự JSON)`);
  }

  const model = message.model;
  return {
    nodeId,
    measuredAt: time.measuredAt,
    timeSource: time.timeSource,
    floodDepthCm: message.flood_depth_cm,
    rainMm1h: message.rain_mm_1h,
    tideCm: message.tide_cm,
    temperatureC: message.temperature_c ?? null,
    humidityPct: message.humidity_pct ?? null,
    lightLux: message.light_lux ?? null,
    batteryPct: message.battery_pct ?? null,
    rssiDbm: message.rssi_dbm ?? null,
    prediction: message.prediction
      ? { depthCm: message.prediction.depth_cm, horizonMinutes: message.prediction.horizon_min }
      : null,
    model: model
      ? {
          version: model.version,
          trainedAt: model.trained_at === null || model.trained_at === undefined ? null : parseTimeValue(model.trained_at),
          samples: model.samples ?? null,
          horizonMinutes: model.horizon_min ?? message.prediction?.horizon_min ?? null,
          intercept: model.intercept,
          coefficients: model.coef,
          maeCm: model.mae_cm ?? null,
          rmseCm: model.rmse_cm ?? null,
          r2: model.r2 ?? null,
        }
      : null,
    location: message.location ? { latitude: message.location.lat, longitude: message.location.lng } : null,
    extra,
  };
}
