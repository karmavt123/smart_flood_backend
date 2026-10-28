import { VIETNAM_UTC_OFFSET_MS } from '../config/floodRules.js';
import type { ClockTime } from './parseClockTime.js';
import type { CalendarDate } from './parseDateText.js';

/** Ngày (theo lịch Việt Nam) của 1 thời điểm. Vd 23:30 giờ UTC ngày 25/10 = 06:30 sáng 26/10 ở VN → 26/10. */
export function vietnamDateOf(instant: Date): CalendarDate {
  const shifted = new Date(instant.getTime() + VIETNAM_UTC_OFFSET_MS);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

/** Ghép ngày + giờ, hiểu là GIỜ VIỆT NAM, ra 1 thời điểm (Date). */
export function vietnamDateTime(date: CalendarDate, clock: ClockTime): Date {
  const asIfUtc = Date.UTC(date.year, date.month - 1, date.day, clock.hour, clock.minute, clock.second);
  return new Date(asIfUtc - VIETNAM_UTC_OFFSET_MS);
}
