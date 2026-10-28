/** Tình trạng kết nối MQTT hiện tại — API /api/v1/health đọc từ đây. */
export const mqttStatus = {
  connected: false,
  url: '',
  /** Số tin nhắn nhận được từ lúc khởi động (để admin biết các trạm có đang gửi không). */
  messagesReceived: 0,
  lastMessageAt: null as string | null,
};
