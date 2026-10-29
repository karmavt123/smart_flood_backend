import type { EraFieldRule, EraTargetField } from './parseEraFieldMap.js';
import type { EraValue } from './readEraValues.js';

export type EraReadingFields = Partial<Record<EraTargetField, number>>;

export interface EraCollectorOptions {
  rules: EraFieldRule[];
  /** Lưu tối đa 1 lần đo mỗi bao nhiêu giây. */
  saveIntervalSec: number;
  /** Gọi khi đã gom đủ 1 lần đo (các trường đã đổi đơn vị theo ERA_FIELD_MAP). */
  onReading: (fields: EraReadingFields) => void;
  /** Gọi khi tới lúc lưu mà vẫn chưa có độ ngập (chưa lưu được). */
  onMissingWaterLevel?: () => void;
  /** Đợi bao lâu sau giá trị đầu tiên để các trường còn lại kịp tới (E-Ra có thể gửi từng trường 1 tin). */
  groupWaitMs?: number;
  /** Đồng hồ (thay được khi chạy thử). */
  now?: () => number;
}

/** Tốc độ dâng: so với lần đo cách đây khoảng 5 phút (cho phép lệch ±90 giây, giống lúc học công thức). */
const RISE_RATE_TARGET_SEC = 300;
const RISE_RATE_TOLERANCE_SEC = 90;
/** Giữ lịch sử độ ngập 15 phút để tính tốc độ dâng. */
const HISTORY_KEEP_MS = 15 * 60_000;

/**
 * GOM CÁC GIÁ TRỊ LẺ TỪ E-RA THÀNH 1 LẦN ĐO.
 * E-Ra không gửi 1 gói tin đủ các trường như trạm SmartFlood: mỗi trường (ngập, mưa...) có thể là 1 tin riêng,
 * và trạm E-Ra hay gửi rất dày (vài giây 1 lần). Nên:
 *   1. Nhận giá trị nào → đổi đơn vị theo ERA_FIELD_MAP → nhớ giá trị MỚI NHẤT của từng trường.
 *   2. Đã qua đủ `saveIntervalSec` kể từ lần lưu trước → đợi thêm `groupWaitMs` cho các trường còn lại tới,
 *      rồi gom các giá trị còn mới thành 1 lần đo.
 *   3. E-Ra không có tốc độ dâng → tự tính: (độ ngập bây giờ − độ ngập ~5 phút trước) / số phút.
 *      Chưa có số đo ~5 phút trước (mới bật máy chủ) thì KHÔNG gửi tốc độ dâng, không ghi bừa 0.
 */
export function createEraCollector(options: EraCollectorOptions) {
  const now = options.now ?? Date.now;
  const groupWaitMs = options.groupWaitMs ?? 3000;
  const intervalMs = options.saveIntervalSec * 1000;
  /** Giá trị của 1 trường cũ hơn mức này thì coi như trạm đã thôi gửi trường đó, không đưa vào lần đo. */
  const staleMs = Math.max(10 * 60_000, 2 * intervalMs);
  const computeRiseRate = !options.rules.some((rule) => rule.target === 'rise_rate_mm_min');

  const latest = new Map<EraTargetField, { value: number; at: number }>();
  const history: Array<{ at: number; waterLevelMm: number }> = [];
  const reportedUnknownKeys = new Set<string>();
  let lastTriggerAt: number | null = null;
  let timer: NodeJS.Timeout | null = null;

  /** Nhận các giá trị từ 1 tin nhắn E-Ra. Trả về các key lần đầu thấy mà ERA_FIELD_MAP chưa khai báo. */
  function push(values: EraValue[]): EraValue[] {
    const at = now();
    const newUnknown: EraValue[] = [];
    let mapped = 0;
    for (const item of values) {
      const rule = options.rules.find((candidate) => candidate.source === item.key);
      if (!rule) {
        if (!reportedUnknownKeys.has(item.key)) {
          reportedUnknownKeys.add(item.key);
          newUnknown.push(item);
        }
        continue;
      }
      latest.set(rule.target, { value: round(item.value * rule.factor + rule.offset), at });
      mapped += 1;
    }
    // Chừa 10% để trạm gửi đúng chu kỳ (vd 60 giây/lần, lưu 60 giây/lần) không bị lỡ mất 1 nửa.
    const dueAgain = lastTriggerAt === null || at - lastTriggerAt >= intervalMs * 0.9;
    if (mapped > 0 && timer === null && dueAgain) {
      lastTriggerAt = at;
      timer = setTimeout(flush, groupWaitMs);
    }
    return newUnknown;
  }

  function flush() {
    timer = null;
    const at = now();
    const fields: EraReadingFields = {};
    for (const [target, item] of latest) {
      if (at - item.at <= staleMs) fields[target] = item.value;
    }
    const waterLevelMm = fields.water_level_mm;
    if (waterLevelMm === undefined) {
      options.onMissingWaterLevel?.();
      return;
    }

    if (computeRiseRate) {
      const riseRate = riseRateFromHistory(at, waterLevelMm);
      if (riseRate !== null) fields.rise_rate_mm_min = riseRate;
    }
    history.push({ at, waterLevelMm });
    while (history.length > 0 && at - history[0]!.at > HISTORY_KEEP_MS) history.shift();

    options.onReading(fields);
  }

  function riseRateFromHistory(at: number, waterLevelMm: number): number | null {
    let best: { at: number; waterLevelMm: number } | null = null;
    for (const item of history) {
      const ageSec = (at - item.at) / 1000;
      if (Math.abs(ageSec - RISE_RATE_TARGET_SEC) > RISE_RATE_TOLERANCE_SEC) continue;
      if (!best || Math.abs(ageSec - RISE_RATE_TARGET_SEC) < Math.abs((at - best.at) / 1000 - RISE_RATE_TARGET_SEC)) best = item;
    }
    if (!best) return null;
    const minutes = (at - best.at) / 60_000;
    return Math.round(((waterLevelMm - best.waterLevelMm) / minutes) * 100) / 100;
  }

  function stop() {
    if (timer) clearTimeout(timer);
    timer = null;
  }

  return { push, stop };
}

/** Bỏ phần lẻ do nhân số thực (0.1 × 3 = 0.30000000000000004 → 0.3). */
function round(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
