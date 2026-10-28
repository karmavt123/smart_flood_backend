import type { Database } from './Database.js';

let current: Database | null = null;

/** Gọi 1 lần lúc khởi động (src/server.ts) để cả backend dùng chung 1 kết nối DB. */
export function setDatabase(database: Database) {
  current = database;
}

/** Lấy kết nối DB dùng chung. Ví dụ: `await db().query('SELECT * FROM nodes')`. */
export function db(): Database {
  if (!current) throw new Error('Chưa kết nối cơ sở dữ liệu (thiếu setDatabase trong server.ts).');
  return current;
}
