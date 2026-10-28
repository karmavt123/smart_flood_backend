import { toVietnamTime, twoDigits } from './toVietnamTime';

/** Hiển thị đầy đủ "giờ:phút ngày/tháng/năm" theo giờ Việt Nam, ví dụ "14:05 22/10/2026". */
export function formatDateTime(iso: string | null | undefined): string {
  const d = toVietnamTime(iso);
  if (!d) return '—';
  return `${twoDigits(d.getUTCHours())}:${twoDigits(d.getUTCMinutes())} ${twoDigits(d.getUTCDate())}/${twoDigits(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}
