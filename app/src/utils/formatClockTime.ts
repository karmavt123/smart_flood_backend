import { toVietnamTime, twoDigits } from './toVietnamTime';

/** Hiển thị giờ:phút theo giờ Việt Nam, ví dụ "14:05". */
export function formatClockTime(iso: string | null | undefined): string {
  const d = toVietnamTime(iso);
  if (!d) return '—';
  return `${twoDigits(d.getUTCHours())}:${twoDigits(d.getUTCMinutes())}`;
}
