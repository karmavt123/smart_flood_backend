import pg from 'pg';

import type { Database } from './Database.js';

/** Kết nối tới PostgreSQL thật bằng chuỗi DATABASE_URL (dùng trên máy chủ). */
export async function connectPostgres(databaseUrl: string): Promise<Database> {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 10 });
  // Thử 1 câu cho chắc là kết nối được, sai mật khẩu thì báo lỗi ngay lúc khởi động.
  await pool.query('SELECT 1');

  return {
    kind: 'postgres',
    async query<Row>(sql: string, params: unknown[] = []) {
      const result = await pool.query(sql, params);
      return result.rows as Row[];
    },
    async exec(sql: string) {
      await pool.query(sql);
    },
    async close() {
      await pool.end();
    },
  };
}
