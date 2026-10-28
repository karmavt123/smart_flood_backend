/** 1 dòng của bảng `model_training_runs`: 1 lần máy chủ học lại công thức cho 1 node. */
export interface TrainingRunRecord {
  id: string;
  node_id: string;
  started_at: Date | string;
  /** auto = tự chạy mỗi ngày; manual = admin bấm "Học lại ngay". */
  trigger: 'auto' | 'manual';
  /** published = có công thức mới và đã gửi về trạm; skipped = giữ công thức cũ; failed = lỗi. */
  status: 'published' | 'skipped' | 'failed';
  reason: string;
  pairs_total: number | null;
  samples_used: number | null;
  base_version: number | null;
  new_version: number | null;
  mae_new_cm: number | null;
  mae_old_cm: number | null;
  mae_baseline_cm: number | null;
}
