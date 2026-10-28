export interface EraValue {
  /** Key trong JSON (kiểu 3rd MQTT Gateway) hoặc "config:<id>" (kiểu thư viện ERa / virtual pin). */
  key: string;
  value: number;
}

/**
 * LẤY CÁC SỐ ĐO TỪ 1 TIN NHẮN TRÊN BROKER E-RA.
 * `subTopic` là phần topic SAU "eoh/chip/<token>". E-Ra có 3 kiểu tin chứa số đo:
 *   /third_party/<device_uid>/data   {"muc_nuoc": 12, "mua": 3}       → key "muc_nuoc", "mua"
 *   /config/<id>/value               {"v": 12}                         → key "config:<id>"
 *   /config_value                    {"12345": 12, "12346": {"v": 3}}  → key "config:12345", "config:12346"
 * Các topic khác (is_online, down, info...) không chứa số đo → trả về null.
 * Giá trị không phải số (chữ, object lồng nhau) thì bỏ qua.
 */
export function readEraValues(subTopic: string, payloadText: string): EraValue[] | null {
  const isThirdParty = /^\/third_party\/[^/]+\/data$/.test(subTopic);
  const configMatch = /^\/config\/(\d+)\/value$/.exec(subTopic);
  const isMultiConfig = subTopic === '/config_value';
  if (!isThirdParty && !configMatch && !isMultiConfig) return null;

  let body: unknown;
  try {
    body = JSON.parse(payloadText);
  } catch {
    return [];
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return [];
  const object = body as Record<string, unknown>;

  if (configMatch) {
    const value = toNumber(object.v);
    return value === null ? [] : [{ key: `config:${configMatch[1]}`, value }];
  }

  const values: EraValue[] = [];
  for (const [key, raw] of Object.entries(object)) {
    if (isMultiConfig) {
      if (!/^\d+$/.test(key)) continue; // bỏ các trường phụ như mốc thời gian
      const inner = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>).v : raw;
      const value = toNumber(inner);
      if (value !== null) values.push({ key: `config:${key}`, value });
    } else {
      const value = toNumber(raw);
      if (value !== null) values.push({ key, value });
    }
  }
  return values;
}

/** Số hoặc chuỗi số ("12.5") → số; còn lại → null. */
function toNumber(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const value = Number(raw.trim());
    return Number.isFinite(value) ? value : null;
  }
  return null;
}
