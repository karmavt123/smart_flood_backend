import type { CoefficientVector, TrainingSample } from './TrainingSample.js';

/** Ĥ(t+5) = a0 + a1·H + a2·V + a3·R + a4·S (mm). Âm thì coi là 0 — nước không thể sâu dưới 0. */
export function predictWithCoefficients(coefficients: CoefficientVector, sample: TrainingSample): number {
  const value = sample.features.reduce((sum, x, j) => sum + coefficients[j + 1]! * x, coefficients[0]!);
  return Math.max(0, value);
}
