/**
 * GIẢI HỆ PHƯƠNG TRÌNH TUYẾN TÍNH A·x = b (A vuông) bằng khử Gauss, có đổi hàng để tránh chia cho số quá nhỏ.
 * Hệ chỉ có 5 ẩn (a0..a4) nên không cần thư viện. Không giải được (ma trận suy biến) thì báo lỗi.
 */
export function solveLinearSystem(matrix: number[][], rhs: number[]): number[] {
  const size = rhs.length;
  // Chép ra để không sửa mảng của nơi gọi: mỗi hàng = [A | b]
  const rows = matrix.map((row, i) => [...row, rhs[i]!]);
  const scale = Math.max(1, ...matrix.flat().map(Math.abs));

  for (let col = 0; col < size; col += 1) {
    let pivot = col;
    for (let r = col + 1; r < size; r += 1) {
      if (Math.abs(rows[r]![col]!) > Math.abs(rows[pivot]![col]!)) pivot = r;
    }
    if (Math.abs(rows[pivot]![col]!) < 1e-12 * scale) {
      throw new Error('Không giải được hệ phương trình: các mẫu quá giống nhau, chưa đủ thông tin để học.');
    }
    [rows[col], rows[pivot]] = [rows[pivot]!, rows[col]!];
    for (let r = 0; r < size; r += 1) {
      if (r === col) continue;
      const factor = rows[r]![col]! / rows[col]![col]!;
      if (factor === 0) continue;
      for (let c = col; c <= size; c += 1) rows[r]![c]! -= factor * rows[col]![c]!;
    }
  }
  return rows.map((row, i) => row[size]! / row[i]!);
}
