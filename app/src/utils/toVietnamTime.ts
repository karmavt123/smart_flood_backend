/**
 * Đổi chuỗi thời gian ISO sang giờ Việt Nam (UTC+7, không có giờ mùa hè).
 * Trả về một Date đã cộng 7 giờ — đọc bằng getUTCHours(), getUTCDate()...
 * Cách này không phụ thuộc cài đặt múi giờ của điện thoại.
 */
export function toVietnamTime(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return new Date(ms + 7 * 60 * 60 * 1000);
}

/** Thêm số 0 phía trước cho đủ 2 chữ số: 5 → "05". */
export function twoDigits(value: number): string {
  return String(value).padStart(2, '0');
}
