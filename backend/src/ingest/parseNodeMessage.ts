import { PREDICTION_HORIZON_MIN } from '../config/modelRules.js';
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
  /** true khi nhập dữ liệu cũ: bắt buộc có ngày + giờ đo. */
  mustHaveDeviceTime: boolean;
  /**
   * true = bắt buộc có V (drain_mm_5min) như gói tin 3.1. Gói tin kiểu CŨ (có rise_rate_mm_min,
   * flood_depth_cm, rain_rate_mm_s/h, rain_mm_1h, tide_cm, node_id) thì vẫn nhận dù không có V.
   */
  requireDrain: boolean;
}

/** Có 1 trong các trường này = gói tin kiểu cũ (trước bản 3.1) → không bắt có V. */
const LEGACY_KEYS = ['rise_rate_mm_min', 'flood_depth_cm', 'rain_rate_mm_s', 'rain_rate_mm_h', 'rain_mm_1h', 'tide_cm', 'node_id', 'measured_at'] as const;

/** 1 cách gửi 1 đại lượng: tên trường, giá trị, nhân bao nhiêu để ra đơn vị lưu trong DB. */
type FieldOption = [key: string, value: number | null | undefined, factor: number];

/**
 * KIỂM TRA + CHUẨN HÓA 1 tin nhắn (đã là object JSON) — nhận cả kiểu tên trường mới lẫn cũ,
 * đổi hết về 1 đơn vị chung trước khi lưu:
 *   mực nước ngập: water_level_mm ÷ 10 → cm      (hoặc flood_depth_cm kiểu cũ)
 *   thủy triều:    tide_m × 100        → cm      (hoặc tide_cm kiểu cũ)
 *   cường độ mưa:  rain_rate_mm_s × 3600 → mm/giờ (hoặc rain_rate_mm_h)
 *   lượng mưa:     rain_mm giữ nguyên (mm)
 *   dự báo:        predicted_water_level_mm ÷ 10 → cm, luôn là 5 phút tới (bản 3.0)
 *   thoát nước V:  drain_mm_5min giữ nguyên (mm/5 phút) — bắt buộc với gói tin 3.1
 *   tốc độ dâng:   rise_rate_mm_min giữ nguyên (mm/phút) — chỉ gói tin cũ (bản 3.0)
 * Sai ở đâu thì ném IngestRejection kèm lý do tiếng Việt, ví dụ "tide_m: thiếu thủy triều (bắt buộc)".
 */
export function parseNodeMessage(input: unknown, options: ParseOptions): ParsedNodeMessage {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new IngestRejection('Tin nhắn phải là 1 object JSON dạng { ... }');
  }
  const result = nodeMessageSchema.safeParse(input);
  if (!result.success) throw new IngestRejection(describeSchemaIssues(result.error, input));
  const message = result.data;
  const issues: string[] = [];

  // Mã node: trong tin nhắn (id hoặc node_id) hoặc trong topic; có nhiều chỗ thì phải giống nhau.
  if (message.id && message.node_id && message.id !== message.node_id) {
    issues.push(`id "${message.id}" khác node_id "${message.node_id}" — chỉ gửi 1 trường`);
  }
  const idInMessage = message.id ?? message.node_id ?? null;
  const nodeId = idInMessage ?? options.nodeIdFromTopic;
  if (!nodeId) issues.push('id: thiếu mã node (ghi trong tin nhắn hoặc trong topic)');
  if (idInMessage && options.nodeIdFromTopic && idInMessage !== options.nodeIdFromTopic) {
    issues.push(`id "${idInMessage}" khác mã node trong topic "${options.nodeIdFromTopic}"`);
  }

  // 3 thông tin bắt buộc: ngập, mưa, triều
  const floodDepthCm = pickOne(
    [
      ['water_level_mm', message.water_level_mm, 0.1],
      ['flood_depth_cm', message.flood_depth_cm, 1],
    ],
    'mực nước ngập',
    issues,
  );
  if (floodDepthCm === undefined) issues.push('water_level_mm: thiếu mực nước ngập (bắt buộc)');

  const tideCm = pickOne(
    [
      ['tide_m', message.tide_m, 100],
      ['tide_cm', message.tide_cm, 1],
    ],
    'thủy triều',
    issues,
  );
  if (tideCm === undefined) issues.push('tide_m: thiếu thủy triều (bắt buộc)');

  const rainRateMmH = pickOne(
    [
      ['rain_rate_mm_s', message.rain_rate_mm_s, 3600],
      ['rain_rate_mm_h', message.rain_rate_mm_h, 1],
    ],
    'cường độ mưa',
    issues,
  );
  const rainMm = message.rain_mm ?? null;
  const rainMm1h = message.rain_mm_1h ?? null;
  if (rainRateMmH === undefined && rainMm === null && rainMm1h === null) {
    issues.push('rain_mm: thiếu thông tin mưa — gửi ít nhất 1 trong rain_mm, rain_rate_mm_s (bắt buộc)');
  }

  // V (tốc độ thoát nước): bắt buộc với gói tin 3.1; gói tin kiểu cũ thì bỏ qua.
  const drainMm5min = message.drain_mm_5min ?? null;
  const isLegacyPacket = LEGACY_KEYS.some((key) => {
    const value = (message as Record<string, unknown>)[key];
    return value !== null && value !== undefined;
  });
  if (options.requireDrain && drainMm5min === null && !isLegacyPacket) {
    issues.push('drain_mm_5min: thiếu tốc độ thoát nước V, mm/5 phút (bắt buộc)');
  }

  // Dự báo: bản 3.0 gửi predicted_water_level_mm (luôn là 5 phút tới); kiểu cũ gửi object prediction.
  const hasPredictedMm = message.predicted_water_level_mm !== null && message.predicted_water_level_mm !== undefined;
  if (hasPredictedMm && message.prediction) {
    issues.push('predicted_water_level_mm và prediction: cùng là dự báo, chỉ gửi 1 trường');
  }
  const prediction = hasPredictedMm
    ? { depthCm: roundStored(message.predicted_water_level_mm! / 10), horizonMinutes: PREDICTION_HORIZON_MIN }
    : message.prediction
      ? { depthCm: message.prediction.depth_cm, horizonMinutes: message.prediction.horizon_min }
      : null;

  // Phiên bản công thức đang dùng: ghi ở model_version, hoặc trong model.version khi gửi kèm cả công thức.
  if (message.model && message.model_version && message.model.version !== message.model_version) {
    issues.push(`model_version ${message.model_version} khác model.version ${message.model.version}`);
  }
  const modelVersion = message.model?.version ?? message.model_version ?? null;

  if (issues.length > 0) throw new IngestRejection(issues.join('; '));

  const time = resolveMeasuredAt(
    { time: message.time, date: message.date, measuredAt: message.measured_at },
    options.receivedAt,
    options.mustHaveDeviceTime,
  );

  // Gom các trường lạ vào extra (giới hạn độ dài để 1 node lỗi không làm phình DB).
  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!KNOWN_MESSAGE_KEYS.has(key)) extra[key] = value;
  }
  Object.assign(extra, time.notes);
  if (JSON.stringify(extra).length > MAX_EXTRA_JSON_LENGTH) {
    throw new IngestRejection(`Các trường thêm quá dài (tối đa ${MAX_EXTRA_JSON_LENGTH} ký tự JSON)`);
  }

  const model = message.model;
  return {
    nodeId: nodeId!,
    measuredAt: time.measuredAt,
    timeSource: time.timeSource,
    floodDepthCm: floodDepthCm!,
    riseRateMmMin: message.rise_rate_mm_min ?? null,
    drainMm5min,
    modelVersion,
    rainMm,
    rainRateMmH: rainRateMmH ?? null,
    rainMm1h,
    tideCm: tideCm!,
    temperatureC: message.temperature_c ?? null,
    humidityPct: message.humidity_pct ?? null,
    lightLux: message.light_lux ?? null,
    batteryPct: message.battery_pct ?? null,
    rssiDbm: message.rssi_dbm ?? null,
    prediction,
    model: model
      ? {
          version: model.version,
          trainedAt: model.trained_at === null || model.trained_at === undefined ? null : parseTimeValue(model.trained_at),
          samples: model.samples ?? null,
          horizonMinutes: model.horizon_min ?? prediction?.horizonMinutes ?? PREDICTION_HORIZON_MIN,
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

/**
 * 1 đại lượng có thể gửi bằng nhiều tên trường (vd tide_m hoặc tide_cm).
 * Trả về giá trị đã đổi đơn vị; undefined = không gửi trường nào. Gửi cả 2 → ghi lỗi (dễ nhầm đơn vị).
 */
function pickOne(options: FieldOption[], label: string, issues: string[]): number | undefined {
  const given = options.filter(([, value]) => value !== null && value !== undefined);
  if (given.length > 1) {
    issues.push(`${given.map(([key]) => key).join(' và ')}: cùng là ${label}, chỉ gửi 1 trường`);
    return 0; // giá trị tạm, tin nhắn sẽ bị từ chối vì đã có lỗi
  }
  if (given.length === 0) return undefined;
  const [, value, factor] = given[0]!;
  return roundStored(value! * factor);
}

/** Bỏ sai số dấu phẩy động khi đổi đơn vị (1.35 × 100 = 135.00000000000003 → 135). */
function roundStored(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
