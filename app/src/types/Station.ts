import type { ConnectionState } from './ConnectionState';
import type { FloodLevel } from './FloodLevel';
import type { FloodThresholds } from './FloodThresholds';
import type { SensorReading } from './SensorReading';
import type { StationModel } from './StationModel';

/** Một trạm đo ngập (1 node), kèm tình trạng mới nhất do máy chủ tính sẵn. */
export interface Station {
  /** Mã trạm, ví dụ "ND-Q1-01". */
  nodeId: string;
  name: string;
  address: string;
  /** Tọa độ; null nếu trạm chưa có vị trí (không đặt lên bản đồ). */
  latitude: number | null;
  longitude: number | null;
  thresholds: FloodThresholds;
  /** Ngưỡng NGUY HIỂM (cm) — để vẽ đường ngưỡng trên biểu đồ. */
  thresholdCm: number;
  /** Độ sâu ngập lần đo cuối (cm); null nếu chưa có. */
  waterLevelCm: number | null;
  /** Mức ngập theo lần đo cuối. */
  floodLevel: FloodLevel;
  /** Mức ngập theo giá trị node dự đoán. */
  predictedLevel: FloodLevel;
  /** Lần cuối có dữ liệu (chuỗi ISO); null nếu chưa có. */
  lastSeenAt: string | null;
  connectionState: ConnectionState;
  /** Bán kính vùng ảnh hưởng ngập (m) do máy chủ tính; 0 = không vẽ. Luôn 0 khi dữ liệu đã cũ. */
  floodRadiusM: number;
  /** Lần đo mới nhất đầy đủ (mưa, triều, nhiệt độ...); null nếu chưa có. */
  latest: SensorReading | null;
  /** Công thức dự đoán node đang dùng; null nếu node chưa gửi. */
  model: StationModel | null;
}
