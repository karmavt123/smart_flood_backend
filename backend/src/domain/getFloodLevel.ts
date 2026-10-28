import type { FloodLevel } from '../types/FloodLevel.js';

interface Thresholds {
  warning_cm: number;
  danger_cm: number;
  critical_cm: number;
}

/**
 * XẾP MỨC NGẬP từ độ sâu (cm) và 3 ngưỡng của node.
 * Ví dụ ngưỡng 10/25/40: 4 cm → normal, 12 cm → warning, 30 cm → danger, 45 cm → critical.
 */
export function getFloodLevel(depthCm: number | null | undefined, thresholds: Thresholds): FloodLevel {
  if (depthCm === null || depthCm === undefined || !Number.isFinite(depthCm)) return 'unknown';
  if (depthCm >= thresholds.critical_cm) return 'critical';
  if (depthCm >= thresholds.danger_cm) return 'danger';
  if (depthCm >= thresholds.warning_cm) return 'warning';
  return 'normal';
}
