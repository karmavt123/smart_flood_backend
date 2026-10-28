import type { StationModel } from '@/types/StationModel';
import { toNumberOrNull } from '@/utils/toNumberOrNull';

/** Chuyển 1 phiên bản công thức trong JSON máy chủ sang StationModel. Thiếu số phiên bản thì trả null. */
export function toStationModel(raw: any): StationModel | null {
  const version = toNumberOrNull(raw?.version);
  if (version === null) return null;
  const coefficients: Record<string, number> = {};
  for (const [name, value] of Object.entries(raw?.coefficients ?? {})) {
    const number = toNumberOrNull(value);
    if (number !== null) coefficients[name] = number;
  }
  return {
    version,
    source: raw.source === 'server' ? 'server' : 'node',
    publishedAt: typeof raw.publishedAt === 'string' ? raw.publishedAt : null,
    appliedAt: typeof raw.appliedAt === 'string' ? raw.appliedAt : null,
    trainedAt: typeof raw.trainedAt === 'string' ? raw.trainedAt : null,
    samples: toNumberOrNull(raw.samples),
    horizonMinutes: toNumberOrNull(raw.horizonMinutes),
    intercept: toNumberOrNull(raw.intercept) ?? 0,
    coefficients,
    maeCm: toNumberOrNull(raw.maeCm),
    rmseCm: toNumberOrNull(raw.rmseCm),
    r2: toNumberOrNull(raw.r2),
    firstSeenAt: typeof raw.firstSeenAt === 'string' ? raw.firstSeenAt : '',
  };
}
