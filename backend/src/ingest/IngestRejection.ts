/** Lỗi "tin nhắn không hợp lệ" — có lý do bằng tiếng Việt để ghi vào bảng ingest_errors cho bên IoT xem. */
export class IngestRejection extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'IngestRejection';
  }
}
