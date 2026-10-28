import type { FloodLevel } from '@/types/FloodLevel';

/**
 * Nhãn, màu và ký hiệu cho từng mức ngập.
 * Luôn hiển thị NHÃN CHỮ kèm màu, để người không phân biệt được màu vẫn hiểu (yêu cầu NFR-05).
 * Màu giống trang web smartflood.vn để người dùng quen.
 */
export const floodLevelStyles: Record<FloodLevel, { label: string; color: string; symbol: string }> = {
  normal: { label: 'An toàn', color: '#10B981', symbol: '●' },
  warning: { label: 'Cảnh báo', color: '#F59E0B', symbol: '▲' },
  danger: { label: 'Nguy hiểm', color: '#F43F5E', symbol: '◆' },
  critical: { label: 'Rất nguy hiểm', color: '#A855F7', symbol: '■' },
  unknown: { label: 'Chưa có dữ liệu', color: '#94A3B8', symbol: '?' },
};

/** Màu xám dùng cho trạm có dữ liệu đã cũ (offline). */
export const STALE_STATION_COLOR = '#94A3B8';
