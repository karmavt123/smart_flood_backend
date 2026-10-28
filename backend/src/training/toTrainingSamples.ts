import type { TrainingPairRow } from '../repositories/training/listTrainingPairs.js';
import type { TrainingSample } from './TrainingSample.js';

export interface SampleSelection {
  /** Các mẫu được dùng để học (đủ số liệu + đang ngập), theo thứ tự thời gian. */
  samples: TrainingSample[];
  /** Tổng số cặp (t, t+5 phút) ghép được. */
  pairsTotal: number;
  /** Số cặp bỏ vì đường khô cả lúc t lẫn lúc t+5 phút. */
  dryPairs: number;
  /** Số cặp bỏ vì thiếu lượng mưa / tốc độ dâng. */
  incompletePairs: number;
}

/**
 * CHỌN MẪU ĐỂ HỌC (chốt 28/10/2026): chỉ học lúc ĐANG NGẬP.
 *   - Bỏ cặp mà độ ngập lúc t VÀ lúc t+5 phút đều ≤ 0 (đường khô, không dạy được gì về ngập —
 *     để lại thì hàng trăm mẫu khô mỗi ngày sẽ kéo hệ số triều, mưa về gần 0).
 *   - GIỮ cặp lúc t còn khô nhưng t+5 phút đã có nước: đó chính là lúc nước BẮT ĐẦU lên, lúc cần dự báo nhất.
 *   - Bỏ cặp thiếu lượng mưa hoặc không tính được tốc độ dâng.
 */
export function toTrainingSamples(rows: TrainingPairRow[]): SampleSelection {
  const samples: TrainingSample[] = [];
  let dryPairs = 0;
  let incompletePairs = 0;

  for (const row of rows) {
    const h = Number(row.h_mm);
    const target = Number(row.target_mm);
    const v = row.v_mm_min === null ? NaN : Number(row.v_mm_min);
    const r = row.rain_mm === null ? NaN : Number(row.rain_mm);
    const s = Number(row.s_m);
    if (![h, v, r, s, target].every(Number.isFinite)) {
      incompletePairs += 1;
      continue;
    }
    if (h <= 0 && target <= 0) {
      dryPairs += 1;
      continue;
    }
    samples.push({ measuredAt: new Date(row.measured_at), features: [h, v, r, s], target });
  }

  return { samples, pairsTotal: rows.length, dryPairs, incompletePairs };
}
