/**
 * "Ổ CẮM" CƠ SỞ DỮ LIỆU — backend chỉ dùng 3 hàm này, nên chạy được với 2 loại DB:
 *   - PostgreSQL thật (máy chủ)                  → src/db/connectPostgres.ts
 *   - PostgreSQL nhúng PGlite (chạy thử laptop)  → src/db/openEmbeddedDatabase.ts
 * Cả 2 đều là PostgreSQL nên câu SQL viết 1 lần dùng được cho cả 2.
 */
export interface Database {
  /** Tên loại DB, để in ra lúc khởi động. */
  kind: 'postgres' | 'pglite';
  /** Chạy 1 câu SQL có tham số $1, $2... và trả về các dòng kết quả. */
  query<Row>(sql: string, params?: unknown[]): Promise<Row[]>;
  /** Chạy nhiều câu SQL liền nhau (không tham số) — dùng khi tạo bảng. */
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}
