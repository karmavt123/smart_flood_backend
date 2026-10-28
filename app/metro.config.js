// Cấu hình đóng gói mặc định của Expo (không thêm gì). Backend mới bật CORS nên bản chạy trên
// trình duyệt gọi thẳng được máy chủ, không cần bộ chuyển tiếp như trước.
const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
