/**
 * Đổi một giá trị bất kỳ thành số. Không đổi được (rỗng, chữ, null...) thì trả null.
 * Dùng để đọc JSON từ máy chủ an toàn: dữ liệu thiếu phải là null, KHÔNG được thành 0.
 */
export function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
