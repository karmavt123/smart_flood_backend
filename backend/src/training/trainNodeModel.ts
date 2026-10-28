import { appConfig } from '../config/appConfig.js';
import {
  MIN_TARGET_SPREAD_MM,
  MIN_VALIDATION_SAMPLES,
  MODEL_VARIABLES,
  PAIR_TOLERANCE_SEC,
  PREDICTION_HORIZON_MIN,
  STARTING_COEFFICIENTS,
  VALIDATION_FRACTION,
  VARIABLE_SCALES,
} from '../config/modelRules.js';
import { publishNodeModel } from '../mqtt/publishNodeModel.js';
import { findLatestNodeModel } from '../repositories/models/findLatestNodeModel.js';
import { insertServerModel } from '../repositories/models/insertServerModel.js';
import { insertTrainingRun, type NewTrainingRun } from '../repositories/training/insertTrainingRun.js';
import { listTrainingPairs } from '../repositories/training/listTrainingPairs.js';
import type { NodeModelRecord } from '../types/NodeModelRecord.js';
import type { TrainingRunRecord } from '../types/TrainingRunRecord.js';
import { fitLinearModel } from './fitLinearModel.js';
import { measureErrors } from './measureErrors.js';
import { predictWithCoefficients } from './predictWithCoefficients.js';
import { toCoefficientVector } from './toCoefficientVector.js';
import { toTrainingSamples } from './toTrainingSamples.js';

export interface TrainingOutcome {
  run: TrainingRunRecord;
  /** Phiên bản mới (chỉ khi học ra công thức tốt hơn). */
  model: NodeModelRecord | null;
}

/** Node đang học dở → không học chồng lên (admin bấm 2 lần, hoặc trùng giờ tự học). */
const nodesInTraining = new Set<string>();

/**
 * MÁY CHỦ HỌC LẠI CÔNG THỨC CHO 1 TRẠM — các bước:
 *   1. Ghép cặp (lúc t → lúc t+5 phút) trong N ngày gần nhất, CHỈ giữ lúc đang ngập.
 *   2. Chưa đủ mẫu → giữ công thức cũ.
 *   3. Chia theo thời gian: 80% cũ để học, 20% mới nhất để KIỂM TRA (công thức chưa thấy phần này bao giờ).
 *   4. Học hệ số, kéo về gần hệ số trạm đang dùng (chưa có thì kéo về Ĥ = H + 5·V).
 *      Độ ngập trong các mẫu gần như không đổi → chưa học được gì, giữ công thức cũ.
 *   5. So sai số trên phần kiểm tra: chỉ nhận khi TỐT HƠN công thức đang dùng
 *      (chưa có công thức thì phải tốt hơn cách đoán "5 phút nữa nước vẫn y như bây giờ").
 *   6. Học lại trên toàn bộ mẫu → lưu phiên bản mới → gửi xuống trạm qua MQTT.
 * Lần học nào cũng ghi nhật ký (model_training_runs), kể cả lần không ra công thức mới.
 * Trả về null nếu trạm này đang học dở.
 */
export async function trainNodeModel(nodeId: string, trigger: 'auto' | 'manual'): Promise<TrainingOutcome | null> {
  if (nodesInTraining.has(nodeId)) return null;
  nodesInTraining.add(nodeId);
  const startedAt = new Date();
  const run: NewTrainingRun = {
    node_id: nodeId,
    started_at: startedAt,
    trigger,
    status: 'skipped',
    reason: '',
    pairs_total: null,
    samples_used: null,
    base_version: null,
    new_version: null,
    mae_new_cm: null,
    mae_old_cm: null,
    mae_baseline_cm: null,
  };

  try {
    const latest = await findLatestNodeModel(nodeId);
    const prior = toCoefficientVector(latest);
    run.base_version = prior ? latest!.version : null;
    const keeping = latest ? `giữ công thức v${latest.version}` : 'trạm vẫn chưa có công thức';

    const horizonSec = PREDICTION_HORIZON_MIN * 60;
    const since = new Date(startedAt.getTime() - appConfig.modelTrainingDays * 86_400_000);
    const until = new Date(startedAt.getTime() - (horizonSec + PAIR_TOLERANCE_SEC) * 1000);
    const rows = await listTrainingPairs(nodeId, since, until, horizonSec, PAIR_TOLERANCE_SEC);
    const selection = toTrainingSamples(rows);
    const samples = selection.samples;
    run.pairs_total = selection.pairsTotal;
    run.samples_used = samples.length;

    // Ít nhất phải đủ chia ra phần học + phần kiểm tra.
    const minSamples = Math.max(appConfig.modelMinSamples, MIN_VALIDATION_SAMPLES * 2);
    if (samples.length < minSamples) {
      run.reason =
        `Chỉ có ${samples.length} cặp mẫu lúc đang ngập trong ${appConfig.modelTrainingDays} ngày qua ` +
        `(cần ít nhất ${minSamples}; đã bỏ ${selection.dryPairs} cặp đường khô, ` +
        `${selection.incompletePairs} cặp thiếu số liệu) → ${keeping}.`;
      return { run: await insertTrainingRun(run), model: null };
    }

    const spread = standardDeviation(samples.map((s) => s.target));
    if (spread < MIN_TARGET_SPREAD_MM) {
      run.reason =
        `Độ ngập trong ${samples.length} cặp mẫu gần như không đổi (dao động ${spread.toFixed(1).replace('.', ',')} mm, ` +
        `cần ≥ ${MIN_TARGET_SPREAD_MM} mm) → chưa học được gì mới, ${keeping}.`;
      return { run: await insertTrainingRun(run), model: null };
    }

    // Bước 3–5: học trên phần cũ, kiểm tra trên phần mới nhất.
    const testCount = Math.max(MIN_VALIDATION_SAMPLES, Math.round(samples.length * VALIDATION_FRACTION));
    const learnPart = samples.slice(0, samples.length - testCount);
    const testPart = samples.slice(samples.length - testCount);
    const fitOptions = {
      prior: prior ?? STARTING_COEFFICIENTS,
      priorWeight: appConfig.modelPriorWeight,
      scales: MODEL_VARIABLES.map((name) => VARIABLE_SCALES[name]),
    };
    const candidate = fitLinearModel(learnPart, fitOptions);

    const candidateErrors = measureErrors(testPart, (s) => predictWithCoefficients(candidate, s));
    const oldErrors = prior ? measureErrors(testPart, (s) => predictWithCoefficients(prior, s)) : null;
    const baselineErrors = measureErrors(testPart, (s) => s.features[0]!); // "nước vẫn y như bây giờ"
    run.mae_new_cm = candidateErrors.mae / 10;
    run.mae_old_cm = oldErrors ? oldErrors.mae / 10 : null;
    run.mae_baseline_cm = baselineErrors.mae / 10;

    const reference = oldErrors ?? baselineErrors;
    const referenceName = oldErrors ? `công thức v${run.base_version}` : 'cách đoán "5 phút nữa nước vẫn như bây giờ"';
    if (!(candidateErrors.mae < reference.mae)) {
      run.reason =
        `Công thức mới sai số ${formatCm(candidateErrors.mae)}, không tốt hơn ${referenceName} ` +
        `(${formatCm(reference.mae)}) trên ${testPart.length} mẫu kiểm tra → ${keeping}.`;
      return { run: await insertTrainingRun(run), model: null };
    }

    // Bước 6: công thức tốt hơn → học lại trên TOÀN BỘ mẫu, lưu, gửi xuống trạm.
    const final = fitLinearModel(samples, fitOptions);
    const coefficients: Record<string, number> = {};
    MODEL_VARIABLES.forEach((name, j) => (coefficients[name] = roundCoefficient(final[j + 1]!)));
    const model = await insertServerModel(nodeId, {
      trainedAt: new Date(),
      samples: samples.length,
      horizonMinutes: PREDICTION_HORIZON_MIN,
      intercept: roundCoefficient(final[0]!),
      coefficients,
      // Sai số ghi theo phần KIỂM TRA (công thức chưa thấy trước), không phải phần đã học — trung thực hơn.
      maeCm: candidateErrors.mae / 10,
      rmseCm: candidateErrors.rmse / 10,
      r2: candidateErrors.r2,
    });
    const published = await publishNodeModel(model);
    if (published) model.published_at = new Date(); // để kết quả trả về cho trang admin thấy ngay

    run.status = 'published';
    run.new_version = model.version;
    run.reason =
      `Học từ ${samples.length} cặp mẫu lúc đang ngập → v${model.version}. ` +
      `Sai số ${formatCm(candidateErrors.mae)} (${referenceName}: ${formatCm(reference.mae)}). ` +
      (published ? 'Đã gửi về trạm.' : 'MQTT đang mất kết nối — máy chủ sẽ tự gửi về trạm khi nối lại.');
    return { run: await insertTrainingRun(run), model };
  } catch (error) {
    run.status = 'failed';
    run.reason = `Lỗi khi học: ${(error as Error).message}`;
    console.error(`[train] ${nodeId}:`, error);
    return { run: await insertTrainingRun(run), model: null };
  } finally {
    nodesInTraining.delete(nodeId);
  }
}

/** Độ lệch chuẩn: các số dao động quanh trung bình bao nhiêu. */
function standardDeviation(values: number[]): number {
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length);
}

/** Sai số mm → chữ "0,34 cm". */
function formatCm(mm: number): string {
  return `${(mm / 10).toFixed(2).replace('.', ',')} cm`;
}

/** Giữ 6 chữ số có nghĩa cho hệ số gọn khi gửi xuống trạm (0.9712345678 → 0.971235). */
function roundCoefficient(value: number): number {
  return Number(value.toPrecision(6));
}
