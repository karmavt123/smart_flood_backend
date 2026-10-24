/** Các thông tin admin được đặt cho 1 node (trang /admin → Sửa node). Trường nào không gửi thì giữ nguyên. */
export interface NodeSettings {
  name?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  warningCm?: number;
  dangerCm?: number;
  criticalCm?: number;
  expectedIntervalSec?: number;
  isActive?: boolean;
}

/** Tên cột trong bảng nodes ứng với từng thông tin. */
export const NODE_SETTING_COLUMNS: Record<keyof NodeSettings, string> = {
  name: 'name',
  address: 'address',
  latitude: 'latitude',
  longitude: 'longitude',
  warningCm: 'warning_cm',
  dangerCm: 'danger_cm',
  criticalCm: 'critical_cm',
  expectedIntervalSec: 'expected_interval_sec',
  isActive: 'is_active',
};
