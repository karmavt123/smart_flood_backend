/** Hiển thị "bao lâu trước", ví dụ "5 phút trước", "3 ngày trước". */
export function formatTimeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return 'chưa có';
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return 'chưa rõ';
  const seconds = Math.max(0, Math.floor((now - ms) / 1000));
  if (seconds < 60) return 'vừa xong';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}
