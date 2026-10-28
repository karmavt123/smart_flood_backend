/**
 * LƯU FILE CSV — bản trình duyệt: tải file về thư mục Tải xuống như bấm "Download".
 * Thêm ký tự BOM ở đầu để Excel đọc đúng tiếng Việt có dấu.
 * Trả về null nếu thành công, hoặc câu báo lỗi.
 */
export async function saveCsvFile(fileName: string, csv: string): Promise<string | null> {
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return null;
}
