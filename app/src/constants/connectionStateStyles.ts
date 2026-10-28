import type { ConnectionState } from '@/types/ConnectionState';

/** Nhãn và màu cho trạng thái kết nối của trạm (giống trang web). */
export const connectionStateStyles: Record<ConnectionState, { label: string; color: string }> = {
  online: { label: 'Online', color: '#16A34A' },
  slow: { label: 'Chậm dữ liệu', color: '#D97706' },
  offline: { label: 'Offline', color: '#DC2626' },
  nodata: { label: 'Chưa có dữ liệu', color: '#64748B' },
};
