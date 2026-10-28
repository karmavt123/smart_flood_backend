/** 1 dòng của bảng `node_models`: 1 phiên bản công thức hồi quy của 1 node. */
export interface NodeModelRecord {
  node_id: string;
  version: number;
  trained_at: Date | string | null;
  samples: number | null;
  horizon_minutes: number | null;
  intercept: number;
  /** Hệ số từng biến, bản 3.0: { H, V, R, S } (xem src/config/modelRules.ts); bản cũ có T, RH, L. */
  coefficients: Record<string, number>;
  mae_cm: number | null;
  rmse_cm: number | null;
  r2: number | null;
  first_seen_at: Date | string;
  /** 'node' = trạm gửi lên, 'server' = máy chủ học. */
  source: 'node' | 'server';
  published_at: Date | string | null;
  applied_at: Date | string | null;
}
