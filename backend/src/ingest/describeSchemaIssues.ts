import type { z } from 'zod';

/**
 * Đổi lỗi kiểm tra dữ liệu của thư viện zod thành câu tiếng Việt dễ hiểu.
 * Ví dụ: `rain_mm_1h: phải ≥ 0 (đang là -3)` hoặc `flood_depth_cm: thiếu trường bắt buộc`.
 */
export function describeSchemaIssues(error: z.ZodError, input: unknown): string {
  return error.issues
    .slice(0, 5)
    .map((issue) => {
      const field = issue.path.join('.') || '(cả tin nhắn)';
      const received = pickValue(input, issue.path);
      if (received === undefined || received === null) return `${field}: thiếu trường bắt buộc`;
      const shown = JSON.stringify(received)?.slice(0, 40);
      switch (issue.code) {
        case 'invalid_type':
          return `${field}: phải là ${issue.expected === 'number' ? 'số' : issue.expected} (đang là ${shown})`;
        case 'too_small':
          return `${field}: phải ≥ ${String(issue.minimum)} (đang là ${shown})`;
        case 'too_big':
          return `${field}: phải ≤ ${String(issue.maximum)} (đang là ${shown})`;
        default:
          return `${field}: ${issue.message} (đang là ${shown})`;
      }
    })
    .join('; ');
}

/** Lấy giá trị ở đường dẫn ["model", "coef", "H"] trong object đầu vào. */
function pickValue(input: unknown, path: PropertyKey[]): unknown {
  let value: unknown = input;
  for (const key of path) {
    if (value === null || typeof value !== 'object') return undefined;
    value = (value as Record<PropertyKey, unknown>)[key];
  }
  return value;
}
