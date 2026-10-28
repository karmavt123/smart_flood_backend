import type { TrainingSample } from './TrainingSample.js';

export interface ErrorSummary {
  /** Sai số tuyệt đối trung bình (mm): trung bình mỗi lần đoán lệch bao nhiêu. */
  mae: number;
  /** Căn trung bình bình phương sai số (mm): phạt nặng những lần đoán lệch nhiều. */
  rmse: number;
  /** R²: 1 = đoán khớp hoàn toàn, 0 = không hơn gì lấy trung bình; null khi đáp án không thay đổi. */
  r2: number | null;
}

/** ĐO SAI SỐ của 1 cách đoán trên các mẫu (đáp án = độ ngập thật lúc t+5 phút). */
export function measureErrors(samples: TrainingSample[], predict: (sample: TrainingSample) => number): ErrorSummary {
  const n = samples.length;
  let absSum = 0;
  let squareSum = 0;
  const mean = samples.reduce((sum, s) => sum + s.target, 0) / n;
  let totalSquares = 0;
  for (const sample of samples) {
    const error = sample.target - predict(sample);
    absSum += Math.abs(error);
    squareSum += error * error;
    totalSquares += (sample.target - mean) ** 2;
  }
  return {
    mae: absSum / n,
    rmse: Math.sqrt(squareSum / n),
    r2: totalSquares > 0 ? 1 - squareSum / totalSquares : null,
  };
}
