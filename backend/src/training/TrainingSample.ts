/**
 * 1 MẪU HỌC: số đo lúc t → độ ngập thật lúc t+5 phút.
 * features theo đúng thứ tự MODEL_VARIABLES = [H, V, R, S] (đơn vị: mm, mm/phút, mm, m).
 */
export interface TrainingSample {
  measuredAt: Date;
  features: number[];
  /** Độ ngập thật lúc t+5 phút (mm). */
  target: number;
}

/** Hệ số công thức dạng mảng: [a0, aH, aV, aR, aS] — a0 là hệ số tự do. */
export type CoefficientVector = number[];
