export interface CalendarDate {
  year: number;
  /** 1 → 12 */
  month: number;
  day: number;
}

/**
 * ĐỌC NGÀY node gửi kèm (trường `date`, không bắt buộc):
 *   "2026-10-26", "2026/10/26"  (năm trước)
 *   "26/10/2026", "26-10-2026"  (kiểu Việt Nam: ngày trước, tháng sau)
 * Trả về null nếu sai dạng hoặc ngày không có thật (vd 31/02/2026).
 */
export function parseDateText(text: string): CalendarDate | null {
  const trimmed = text.trim();
  let year: number;
  let month: number;
  let day: number;
  let match = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(trimmed);
  if (match) {
    [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else {
    match = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(trimmed);
    if (!match) return null;
    [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  }
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  return { year, month, day };
}
