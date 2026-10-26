/**
 * NHẬP DỮ LIỆU CŨ (bên IoT đưa) VÀO DB — gửi qua API /api/v1/admin/import của backend đang chạy.
 *
 *   npm run import -- duong-dan/du-lieu.json
 *   npm run import -- du-lieu.csv --api https://api.smartflood.vn --key <ADMIN_API_KEY>
 *
 * Nhận 3 kiểu file, mỗi tin nhắn đúng định dạng trong IOT_DATA_FORMAT.md (BẮT BUỘC có ngày + giờ đo: date + time, hoặc measured_at):
 *   .json   mảng [ {...}, {...} ]  hoặc  { "messages": [ ... ] }
 *   .jsonl  mỗi dòng 1 object JSON
 *   .csv    dòng đầu là tên cột; cột lồng nhau viết bằng dấu chấm, vd prediction.depth_cm, model.coef.H
 * Nhập lại cùng file không bị trùng (lần đo trùng node + thời điểm sẽ bỏ qua).
 */
import { readFileSync } from 'node:fs';

import 'dotenv/config';

function readArg(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1]! : fallback;
}

const file = process.argv.slice(2).find((arg, i, all) => !arg.startsWith('--') && !all[i - 1]?.startsWith('--'));
const apiUrl = readArg('api', `http://localhost:${process.env.PORT || 3000}`).replace(/\/+$/, '');
const adminKey = readArg('key', process.env.ADMIN_API_KEY || 'dev-admin-key');
const BATCH_SIZE = 1000;

if (!file) {
  console.error('Thiếu đường dẫn file. Ví dụ: npm run import -- du-lieu.json');
  process.exit(1);
}

/** Tách 1 dòng CSV thành các ô (hỗ trợ ô có dấu phẩy nằm trong "ngoặc kép"). */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      cells.push(cell);
      cell = '';
    } else cell += ch;
  }
  cells.push(cell);
  return cells.map((c) => c.trim());
}

/** Đặt giá trị vào object theo tên cột có dấu chấm: "model.coef.H" → { model: { coef: { H: ... } } }. */
function setDeep(target: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split('.');
  let node = target;
  for (const key of keys.slice(0, -1)) {
    if (typeof node[key] !== 'object' || node[key] === null) node[key] = {};
    node = node[key] as Record<string, unknown>;
  }
  node[keys[keys.length - 1]!] = value;
}

function parseCsv(text: string): unknown[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  const header = splitCsvLine(lines[0] ?? '');
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const message: Record<string, unknown> = {};
    header.forEach((column, i) => {
      const raw = cells[i] ?? '';
      if (raw === '') return; // ô trống = không có dữ liệu (KHÔNG phải 0)
      setDeep(message, column, /^-?\d+(\.\d+)?$/.test(raw) ? Number(raw) : raw);
    });
    return message;
  });
}

function readMessages(path: string): unknown[] {
  const text = readFileSync(path, 'utf8').replace(/^﻿/, ''); // bỏ ký tự BOM nếu file lưu từ Excel
  if (path.toLowerCase().endsWith('.csv')) return parseCsv(text);
  if (path.toLowerCase().endsWith('.jsonl')) return text.split(/\r?\n/).filter((l) => l.trim()).map((l) => JSON.parse(l));
  const data = JSON.parse(text) as unknown;
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray((data as { messages?: unknown[] }).messages)) {
    return (data as { messages: unknown[] }).messages;
  }
  throw new Error('File JSON phải là mảng [ ... ] hoặc { "messages": [ ... ] }');
}

async function main() {
  const messages = readMessages(file!);
  console.log(`Đọc được ${messages.length} tin nhắn từ ${file}. Gửi tới ${apiUrl} ...`);
  let saved = 0;
  let duplicates = 0;
  let rejected = 0;
  for (let start = 0; start < messages.length; start += BATCH_SIZE) {
    const batch = messages.slice(start, start + BATCH_SIZE);
    const response = await fetch(`${apiUrl}/api/v1/admin/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({ messages: batch }),
    });
    const result = (await response.json()) as {
      error?: string;
      saved: number;
      duplicates: number;
      rejectedCount: number;
      rejected: { index: number; reason: string }[];
    };
    if (!response.ok) throw new Error(result.error ?? `API trả về mã ${response.status}`);
    saved += result.saved;
    duplicates += result.duplicates;
    rejected += result.rejectedCount;
    for (const item of result.rejected.slice(0, 10)) {
      console.warn(`  Dòng/tin số ${start + item.index + 1} bị từ chối: ${item.reason}`);
    }
  }
  console.log(`Xong: lưu mới ${saved}, trùng (bỏ qua) ${duplicates}, bị từ chối ${rejected}.`);
}

main().catch((error: unknown) => {
  console.error('Nhập dữ liệu thất bại:', (error as Error).message);
  process.exit(1);
});
