import { HttpError } from './HttpError.js';

/** Đọc 1 tham số số trên URL (?lat=10.77). Thiếu thì dùng mặc định; ghi sai hoặc ngoài khoảng thì báo lỗi 400. */
export function readQueryNumber(
  value: unknown,
  name: string,
  options: { min: number; max: number; fallback?: number },
): number {
  if (value === undefined || value === '') {
    if (options.fallback !== undefined) return options.fallback;
    throw new HttpError(400, `Thiếu tham số ${name}`);
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < options.min || number > options.max) {
    throw new HttpError(400, `Tham số ${name} phải là số từ ${options.min} đến ${options.max}`);
  }
  return number;
}
