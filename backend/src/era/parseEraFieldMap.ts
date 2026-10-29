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
  /** Tên trường bên E-Ra: key trong JSON (vd "muc_nuoc", "khoang cach") hoặc "config:<id>" (vd "config:12345"). */
  source: string;
  /** Trường tương ứng trong gói tin SmartFlood. */
  target: EraTargetField;
  /** Nhân với số này để ra đúng đơn vị (vd E-Ra gửi cm → water_level_mm cần *10). */
  factor: number;
  /** Cộng thêm số này SAU khi nhân (vd đổi khoảng cách cảm biến → độ ngập). */
  offset: number;
}

/**
 * ĐỌC ERA_FIELD_MAP: trường nào bên E-Ra ứng với trường nào trong gói tin SmartFlood.
 * Dạng: các cặp "nguồn=đích", "nguồn=đích*a" hoặc "nguồn=đích*a+b", cách nhau bằng dấu phẩy
 * (giá trị lưu = giá trị E-Ra × a + b). Ví dụ:
 *     muc_nuoc=water_level_mm*10, mua=rain_mm, config:12345=tide_m
 *     khoang cach=water_level_mm*-10+800
 * → "muc_nuoc" (cm) nhân 10 thành mm; "mua" giữ nguyên; config id 12345 là thủy triều (m);
 *   "khoang cach" là KHOẢNG CÁCH từ cảm biến xuống mặt nước (cm), cảm biến treo cao 80 cm so với mặt đường khô
 *   → độ ngập (mm) = (80 − khoảng cách) × 10 = khoảng cách × (−10) + 800.
 * Tên nguồn được có dấu cách. Ghi sai thì báo lỗi ngay lúc khởi động, kèm lý do.
 */
export function parseEraFieldMap(text: string): EraFieldRule[] {
  const rules: EraFieldRule[] = [];
  const parts = text.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) throw new Error('ERA_FIELD_MAP đang trống. Ví dụ: muc_nuoc=water_level_mm*10,mua=rain_mm');

  for (const part of parts) {
    const match = /^([^=]+?)\s*=\s*([a-z_]+)\s*(?:\*\s*([-+]?\d+(?:\.\d+)?))?\s*(?:([+-])\s*(\d+(?:\.\d+)?))?$/.exec(part);
    if (!match) {
      throw new Error(`ERA_FIELD_MAP: không hiểu "${part}" (đúng dạng: nguon=dich, nguon=dich*10 hoặc nguon=dich*-10+800)`);
    }
    const [, source, target, factorText, offsetSign, offsetText] = match;
    if (!(ERA_TARGET_FIELDS as readonly string[]).includes(target!)) {
      throw new Error(`ERA_FIELD_MAP: "${target}" không phải trường hợp lệ. Chọn 1 trong: ${ERA_TARGET_FIELDS.join(', ')}`);
    }
    const factor = factorText === undefined ? 1 : Number(factorText);
    if (factor === 0) throw new Error(`ERA_FIELD_MAP: hệ số nhân của "${part}" không được bằng 0`);
    if (rules.some((rule) => rule.source === source)) throw new Error(`ERA_FIELD_MAP: "${source}" bị khai báo 2 lần`);
    if (rules.some((rule) => rule.target === target)) throw new Error(`ERA_FIELD_MAP: 2 nguồn cùng đổ vào "${target}"`);
    const offset = offsetText === undefined ? 0 : (offsetSign === '-' ? -1 : 1) * Number(offsetText);
    rules.push({ source: source!, target: target as EraTargetField, factor, offset });
  }
  return rules;
}
