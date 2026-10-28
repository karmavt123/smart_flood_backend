import { toVietnamTime, twoDigits } from './toVietnamTime';

/** Hiển thị gọn "ngày/tháng giờ:phút", dùng cho trục biểu đồ khi khoảng thời gian dài hơn 1 ngày. */
export function formatDayAndTime(iso: string | null | undefined): string {
  const d = toVietnamTime(iso);
  if (!d) return '—';
  return `${twoDigits(d.getUTCDate())}/${twoDigits(d.getUTCMonth() + 1)} ${twoDigits(d.getUTCHours())}:${twoDigits(d.getUTCMinutes())}`;
}
