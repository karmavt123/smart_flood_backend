import type { FloodLevel } from '../types/FloodLevel.js';

/** Mức này có tính là "đang ngập" không (từ Cảnh báo trở lên). */
export function isFloodingLevel(level: FloodLevel): boolean {
  return level === 'warning' || level === 'danger' || level === 'critical';
}
