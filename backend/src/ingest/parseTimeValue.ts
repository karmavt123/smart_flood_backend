/**
 * ĐỌC THỜI GIAN node gửi lên, trả về Date hoặc null nếu không đọc được.
 *   - Số < 100 tỷ  → số GIÂY Unix (vd 1792911900 = 14:05 ngày 25/10/2026 giờ VN)
 *   - Số lớn hơn   → số MILI-GIÂY Unix
 *   - Chuỗi ISO có múi giờ ("...Z" hoặc "...+07:00") → đọc đúng múi giờ
 *   - Chuỗi KHÔNG ghi múi giờ ("2026-10-25 14:05:00") → hiểu là GIỜ VIỆT NAM (+07:00)
 */
export function parseTimeValue(value: string | number): Date | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return new Date(value < 1e11 ? value * 1000 : value);
  }
  const text = value.trim().replace(' ', 'T');
  const hasTimeZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(text);
  const isoLike = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text);
  if (!isoLike) return null;
  const date = new Date(hasTimeZone ? text : `${text}+07:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}
