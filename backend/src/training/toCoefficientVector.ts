import { MODEL_VARIABLES, PREDICTION_HORIZON_MIN } from '../config/modelRules.js';
import type { NodeModelRecord } from '../types/NodeModelRecord.js';
import type { CoefficientVector } from './TrainingSample.js';

/**
 * Lấy hệ số [a0, aH, aV, aR, aS] từ 1 phiên bản công thức để học tiếp.
 * Trả null nếu công thức đó KHÔNG CÙNG KIỂU với bản 3.0 (vd công thức cũ trong báo cáo có T, RH, L,
 * hoặc dự đoán cho số phút khác) — khi đó máy chủ học từ đầu.
 */
export function toCoefficientVector(model: NodeModelRecord | null): CoefficientVector | null {
  if (!model) return null;
  if (model.horizon_minutes !== null && model.horizon_minutes !== PREDICTION_HORIZON_MIN) return null;
  const names = Object.keys(model.coefficients ?? {});
  const sameVariables = names.length === MODEL_VARIABLES.length && MODEL_VARIABLES.every((name) => names.includes(name));
  if (!sameVariables) return null;
  return [Number(model.intercept), ...MODEL_VARIABLES.map((name) => Number(model.coefficients[name]))];
}
