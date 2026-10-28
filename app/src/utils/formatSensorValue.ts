/**
 * Hiển thị một số đo kèm đơn vị, ví dụ "32.4 cm".
 * Thiếu dữ liệu thì ghi "Chưa có dữ liệu" — KHÔNG hiển thị 0 (yêu cầu mục 2.2).
 */
export function formatSensorValue(value: number | null | undefined, unit: string, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'Chưa có dữ liệu';
  return `${value.toFixed(digits)} ${unit}`;
}
