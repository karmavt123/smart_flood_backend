import type { FloodLevel } from '@/types/FloodLevel';

/** Đọc mức ngập từ máy chủ ("normal" / "warning" / "danger" / "critical"); lạ thì là "unknown". */
export function toFloodLevel(value: unknown): FloodLevel {
  if (value === 'normal' || value === 'warning' || value === 'danger' || value === 'critical') return value;
  return 'unknown';
}
