/** Viết 1 hệ số cho dễ đọc kiểu Việt Nam: tối đa 5 chữ số có nghĩa, dấu phẩy thập phân. Vd 0.98512 → "0,98512", 4.8 → "4,8". */
export function formatModelNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const text = Number(value.toPrecision(5)).toString();
  return text.replace('.', ',');
}
