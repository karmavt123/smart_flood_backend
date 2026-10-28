/** Tình trạng cầu nối E-Ra hiện tại — API /api/v1/health đọc từ đây (chỉ hiện khi đã bật cầu nối). */
export const eraStatus = {
  enabled: false,
  connected: false,
  /** Mã trạm SmartFlood nhận dữ liệu từ gateway E-Ra. */
  nodeId: '',
  /** Số tin nhắn nhận từ broker E-Ra từ lúc khởi động (kể cả tin không phải số đo). */
  messagesReceived: 0,
  /** Số lần đo đã lưu vào DB. */
  readingsSaved: 0,
  lastMessageAt: null as string | null,
  lastReadingAt: null as string | null,
  /** Lỗi gần nhất (đã che token), vd "Connection refused: Not authorized". */
  lastError: null as string | null,
};
