import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * TẢI DỮ LIỆU + TỰ TẢI LẠI ĐỊNH KỲ.
 *
 * Cách dùng:  const { data, error, loading, reload } = useAutoRefresh(() => getStationList(), [], 30000);
 *   - `load` là hàm lấy dữ liệu (gọi API).
 *   - `deps` là các giá trị mà khi đổi thì phải tải lại từ đầu (ví dụ mã trạm đang xem).
 *   - `intervalMs` = bao lâu tải lại một lần; 0 = chỉ tải một lần.
 *
 * Quy tắc an toàn (theo tài liệu yêu cầu):
 *   - Đổi trạm → xóa dữ liệu cũ ngay, không hiện nhầm số của trạm trước.
 *   - Phản hồi đến muộn của lần gọi cũ bị bỏ qua (không ghi đè dữ liệu mới).
 *   - Lỗi mạng KHÔNG xóa dữ liệu đang có: màn hình vẫn hiện số gần nhất kèm thông báo lỗi.
 */
export function useAutoRefresh<T>(load: () => Promise<T>, deps: readonly unknown[], intervalMs = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const result = await loadRef.current();
      if (id !== requestId.current) return; // có lần gọi mới hơn rồi → bỏ kết quả này
      setData(result);
      setError(null);
    } catch (e) {
      if (id !== requestId.current) return;
      setError(e instanceof Error ? e.message : 'Lỗi không xác định');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setData(null);
    setError(null);
    setLoading(true);
    reload();
    const timer = intervalMs > 0 ? setInterval(reload, intervalMs) : null;
    return () => {
      if (timer) clearInterval(timer);
      requestId.current++; // vô hiệu các lần gọi đang chạy dở
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload, intervalMs, ...deps]);

  return { data, error, loading, reload };
}
