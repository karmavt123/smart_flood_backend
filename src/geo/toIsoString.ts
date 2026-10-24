/** Đổi thời gian từ DB (Date hoặc chuỗi) sang chuỗi ISO chuẩn "2026-10-25T07:00:00.000Z"; null giữ nguyên null. */
export function toIsoString(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
