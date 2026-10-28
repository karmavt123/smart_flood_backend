/** Các trường gói tin SmartFlood mà 1 trường E-Ra được phép đổ vào (xem IOT_DATA_FORMAT.md mục 3). */
export const ERA_TARGET_FIELDS = [
  'water_level_mm',
  'rise_rate_mm_min',
  'rain_mm',
  'tide_m',
  'rssi_dbm',
  'battery_pct',
  'temperature_c',
] as const;

export type EraTargetField = (typeof ERA_TARGET_FIELDS)[number];

export interface EraFieldRule {
  /** Tên trường bên E-Ra: key trong JSON (vd "muc_nuoc") hoặc "config:<id>" (vd "config:12345"). */
  source: string;
  /** Trường tương ứng trong gói tin SmartFlood. */
  target: EraTargetField;
  /** Nhân với số này để ra đúng đơn vị (vd E-Ra gửi cm → water_level_mm cần *10). */
  factor: number;
}

/**
 * ĐỌC ERA_FIELD_MAP: trường nào bên E-Ra ứng với trường nào trong gói tin SmartFlood.
 * Dạng: các cặp "nguồn=đích" hoặc "nguồn=đích*hệ_số", cách nhau bằng dấu phẩy. Ví dụ:
 *     muc_nuoc=water_level_mm*10, mua=rain_mm, config:12345=tide_m
 * → key "muc_nuoc" (cm) nhân 10 thành mm; key "mua" giữ nguyên; config id 12345 là thủy triều (m).
 * Ghi sai thì báo lỗi ngay lúc khởi động, kèm lý do.
 */
export function parseEraFieldMap(text: string): EraFieldRule[] {
  const rules: EraFieldRule[] = [];
  const parts = text.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) throw new Error('ERA_FIELD_MAP đang trống. Ví dụ: muc_nuoc=water_level_mm*10,mua=rain_mm');

  for (const part of parts) {
    const match = /^([^=\s]+)\s*=\s*([a-z_]+)\s*(?:\*\s*([-+]?\d+(?:\.\d+)?))?$/.exec(part);
    if (!match) throw new Error(`ERA_FIELD_MAP: không hiểu "${part}" (đúng dạng: nguon=dich hoặc nguon=dich*10)`);
    const [, source, target, factorText] = match;
    if (!(ERA_TARGET_FIELDS as readonly string[]).includes(target!)) {
      throw new Error(`ERA_FIELD_MAP: "${target}" không phải trường hợp lệ. Chọn 1 trong: ${ERA_TARGET_FIELDS.join(', ')}`);
    }
    const factor = factorText === undefined ? 1 : Number(factorText);
    if (factor === 0) throw new Error(`ERA_FIELD_MAP: hệ số nhân của "${part}" không được bằng 0`);
    if (rules.some((rule) => rule.source === source)) throw new Error(`ERA_FIELD_MAP: "${source}" bị khai báo 2 lần`);
    if (rules.some((rule) => rule.target === target)) throw new Error(`ERA_FIELD_MAP: 2 nguồn cùng đổ vào "${target}"`);
    rules.push({ source: source!, target: target as EraTargetField, factor });
  }
  return rules;
}
