/** 3 NGƯỠNG NGẬP của một trạm (cm nước trên mặt đường). */
export interface FloodThresholds {
  /** Từ mức này: Cảnh báo */
  warningCm: number;
  /** Từ mức này: Nguy hiểm */
  dangerCm: number;
  /** Từ mức này: Rất nguy hiểm */
  criticalCm: number;
}
