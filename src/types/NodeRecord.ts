/** 1 dòng của bảng `nodes` đúng như trong cơ sở dữ liệu (tên cột viết kiểu snake_case). */
export interface NodeRecord {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  warning_cm: number;
  danger_cm: number;
  critical_cm: number;
  expected_interval_sec: number;
  is_active: boolean;
  last_message_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}
