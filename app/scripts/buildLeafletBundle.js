/**
 * TẠO LẠI src/components/map/android/leafletBundle.ts (thư viện Leaflet đóng gói cho bản đồ Android).
 * Chỉ cần chạy khi nâng cấp phiên bản leaflet:   node scripts/buildLeafletBundle.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'node_modules/leaflet/dist/leaflet.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/components/map/leafletMapStyles.css'), 'utf8');
const out =
  '/**\n * THƯ VIỆN BẢN ĐỒ LEAFLET 1.9.4 (giấy phép BSD-2, © Volodymyr Agafonkin) đóng gói sẵn dạng chuỗi,\n' +
  ' * để bản đồ Android chạy trong WebView KHÔNG phải tải thư viện từ Internet (chỉ cần Internet để tải nền bản đồ).\n' +
  ' * File TẠO TỰ ĐỘNG từ node_modules/leaflet/dist/leaflet.js + leafletMapStyles.css — KHÔNG sửa tay.\n' +
  ' * Tạo lại: node scripts/buildLeafletBundle.js\n */\n/* eslint-disable */\n' +
  `export const LEAFLET_JS = ${JSON.stringify(js)};\nexport const LEAFLET_CSS = ${JSON.stringify(css)};\n`;
fs.writeFileSync(path.join(root, 'src/components/map/android/leafletBundle.ts'), out);
console.log('Đã tạo src/components/map/android/leafletBundle.ts');
