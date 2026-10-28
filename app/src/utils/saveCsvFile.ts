import { Share } from 'react-native';

/** Chia sẻ dạng chữ quá dài thì Android dễ lỗi, nên giới hạn khoảng 200 nghìn ký tự. */
const MAX_SHARE_LENGTH = 200_000;

/**
 * LƯU FILE CSV — bản điện thoại: mở bảng "Chia sẻ" của máy với nội dung CSV
 * (gửi qua Zalo, email, lưu vào ghi chú... rồi dán vào Excel / Google Sheets).
 * Không cần cài thêm thư viện. Dữ liệu quá dài thì báo dùng bản web hoặc chọn khoảng ngắn hơn.
 * Trả về null nếu thành công, hoặc câu báo lỗi.
 */
export async function saveCsvFile(fileName: string, csv: string): Promise<string | null> {
  if (csv.length > MAX_SHARE_LENGTH) {
    return 'Dữ liệu dài quá để chia sẻ trên điện thoại. Hãy chọn khoảng 1 giờ / 24 giờ, hoặc xuất trên bản web (laptop).';
  }
  try {
    await Share.share({ title: fileName, message: csv });
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Không mở được bảng chia sẻ.';
  }
}
