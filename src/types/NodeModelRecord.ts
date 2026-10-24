/** 1 dòng của bảng `node_models`: 1 phiên bản công thức hồi quy của 1 node. */
export interface NodeModelRecord {
  node_id: string;
  version: number;
  trained_at: Date | string | null;
  samples: number | null;
  horizon_minutes: number | null;
  intercept: number;
  /** Hệ số từng biến, vd { H: 0.98, V: 4.6, T: 0.004, RH: 0.001, L: 0 } */
  coefficients: Record<string, number>;
  mae_cm: number | null;
  rmse_cm: number | null;
  r2: number | null;
  first_seen_at: Date | string;
}
