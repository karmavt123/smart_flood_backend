import type { CoefficientVector, TrainingSample } from './TrainingSample.js';
import { solveLinearSystem } from './solveLinearSystem.js';

export interface FitOptions {
  /** Hệ số cũ [a0, aH, aV, aR, aS] để "kéo về"; null = học từ đầu. */
  prior: CoefficientVector | null;
  /** Hệ số cũ nặng bao nhiêu: 0 = bỏ hẳn, 0.2 = mặc định, 1 = ngang toàn bộ dữ liệu mới. */
  priorWeight: number;
  /** Mức dao động điển hình của từng biến [H, V, R, S] (xem VARIABLE_SCALES). */
  scales: number[];
}

/**
 * HỌC HỆ SỐ HỒI QUY TUYẾN TÍNH, KÉO VỀ GẦN HỆ SỐ CŨ (đúng ý "dùng hệ số cũ của trạm + mẫu mới để ra hệ số mới").
 *
 * Tìm a0..a4 nhỏ nhất hóa:
 *     Σ (độ ngập thật − Ĥ)²   +   λ · n · Σⱼ dⱼ² · (aⱼ − aⱼ_cũ)²
 * trong đó n = số mẫu, dⱼ = mức dao động điển hình của biến j (VARIABLE_SCALES), nên phần "kéo" có
 * cùng đơn vị với sai số (mm²): đổi aⱼ một lượng Δ làm dự báo lệch khoảng Δ·dⱼ.
 * Dữ liệu nhiều và biến dao động mạnh → dữ liệu quyết định; biến gần như không đổi → hệ số ở gần hệ số cũ
 * (không bị đẩy lên số khổng lồ chỉ để khớp vài mẫu). Hệ số tự do a0 không bị kéo.
 * Không có hệ số cũ thì gần như hồi quy bình phương nhỏ nhất bình thường.
 *
 * Biến nào trong dữ liệu KHÔNG thay đổi (vd cả đợt không mưa → R luôn = 0) thì không học được hệ số cho nó:
 * giữ nguyên hệ số cũ (chưa có thì 0) thay vì đoán bừa.
 */
export function fitLinearModel(samples: TrainingSample[], options: FitOptions): CoefficientVector {
  const n = samples.length;
  if (n === 0) throw new Error('Không có mẫu nào để học.');
  const variableCount = samples[0]!.features.length;

  const means = new Array<number>(variableCount).fill(0);
  for (const sample of samples) sample.features.forEach((x, j) => (means[j]! += x / n));
  const spread = new Array<number>(variableCount).fill(0);
  for (const sample of samples) sample.features.forEach((x, j) => (spread[j]! += (x - means[j]!) ** 2));

  // Biến không đổi → giữ hệ số cũ; biến còn lại → đưa vào hệ phương trình.
  const fixed = spread.map((s, j) => (s <= 1e-9 * n ? (options.prior ? options.prior[j + 1]! : 0) : null));
  const active = fixed.flatMap((value, j) => (value === null ? [j] : []));
  const size = active.length + 1;

  const matrix = Array.from({ length: size }, () => new Array<number>(size).fill(0));
  const rhs = new Array<number>(size).fill(0);
  for (const sample of samples) {
    const z = [1, ...active.map((j) => sample.features[j]!)];
    const y = sample.target - fixed.reduce<number>((sum, c, j) => sum + (c === null ? 0 : c * sample.features[j]!), 0);
    for (let r = 0; r < size; r += 1) {
      rhs[r]! += z[r]! * y;
      for (let c = 0; c < size; c += 1) matrix[r]![c]! += z[r]! * z[c]!;
    }
  }

  // Phần "kéo về hệ số cũ". Không có hệ số cũ vẫn cộng 1 lượng rất nhỏ cho hệ phương trình ổn định.
  const lambda = options.prior ? options.priorWeight : 1e-9;
  active.forEach((j, index) => {
    const penalty = lambda * n * options.scales[j]! ** 2;
    matrix[index + 1]![index + 1]! += penalty;
    if (options.prior) rhs[index + 1]! += penalty * options.prior[j + 1]!;
  });

  const solution = solveLinearSystem(matrix, rhs);
  const coefficients: CoefficientVector = [solution[0]!];
  for (let j = 0; j < variableCount; j += 1) {
    const index = active.indexOf(j);
    coefficients.push(index === -1 ? fixed[j]! : solution[index + 1]!);
  }
  return coefficients;
}
