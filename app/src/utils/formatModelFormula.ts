import type { StationModel } from '@/types/StationModel';

import { formatModelNumber } from './formatModelNumber';
import { sortModelVariables } from './sortModelVariables';

/**
 * VIẾT CÔNG THỨC THÀNH 1 DÒNG CHỮ, ví dụ:
 *   Ĥ(t+5′) = 0,41 + 0,968·H + 6,1·V + 0,001·T + 0,003·RH + 0·L
 */
export function formatModelFormula(model: StationModel): string {
  const terms = sortModelVariables(Object.keys(model.coefficients)).map((name) => {
    const value = model.coefficients[name] ?? 0;
    return `${value < 0 ? '−' : '+'} ${formatModelNumber(Math.abs(value))}·${name}`;
  });
  return `Ĥ(t+${model.horizonMinutes ?? '?'}′) = ${formatModelNumber(model.intercept)} ${terms.join(' ')}`;
}
