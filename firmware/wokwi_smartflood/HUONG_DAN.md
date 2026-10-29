# Trạm SmartFlood giả lập trên Wokwi (không cần chip thật)

Chạy 1 con ESP32 ảo trên web, gửi **thẳng** lên máy chủ `flood.agentwf.xyz` đúng gói tin 3.0. 3 núm vặn thay cho cảm biến:

| Núm | Chân | Giả lập |
|---|---|---|
| 1 | GPIO34 | Độ ngập 0 → 500 mm (vặn lên = nước dâng) |
| 2 | GPIO35 | Lượng mưa 0 → 50 mm |
| 3 | GPIO32 | Thủy triều 0 → 3 m |

## Chạy

1. Vào https://wokwi.com → **New Project** → **ESP32** (Arduino).
2. Tab `sketch.ino`: xóa hết, dán nội dung file `sketch.ino` ở đây.
3. Tab `diagram.json`: xóa hết, dán nội dung file `diagram.json` (sẽ hiện ESP32 + 3 núm vặn).
4. Thêm thư viện: bấm **Library Manager** (biểu tượng sách) → **+** → thêm `PubSubClient` và `ArduinoJson`.
5. Trong `sketch.ino`, thay `DIEN_MAT_KHAU_MQTT` bằng mật khẩu MQTT.
6. Bấm ▶. Serial Monitor phải hiện:
   ```
   [WiFi] Dang noi Wokwi-GUEST... OK
   [MQTT] Dang noi flood.agentwf.xyz:1883 ... OK
   [MQTT] Gui OK: {"id":"TEST-WOKWI",...}
   ```
7. Mở trang admin máy chủ / app: có trạm **TEST-WOKWI** ở ĐH Bách Khoa, số liệu đổi mỗi 30 giây theo núm vặn.

## ⚠ Mật khẩu

- **KHÔNG bấm Save / Share** khi trong code có mật khẩu: project Wokwi miễn phí là **công khai**.
- Mạng ảo của Wokwi (Wokwi-GUEST) đi qua máy chủ của Wokwi và **bị Wokwi giám sát**. Dùng để thử thì được; thi xong nên nhờ anh mentor đổi mật khẩu `smartflood-gateway`.

## Thử trọn vòng học lại công thức

1. Để chạy **khoảng 20 phút**, thỉnh thoảng vặn núm 1 lên xuống (độ ngập phải > 0 và có thay đổi, không thì máy chủ không học được gì).
2. Trang admin → **Xem / Sửa** `TEST-WOKWI` → **Học lại ngay**.
3. Serial Monitor hiện `[MODEL] Nhan cong thuc v1: ...`, các tin sau có thêm `predicted_water_level_mm` (dự báo 5 phút tới) và `model_version`.
4. Không thấy `[MODEL]` dù admin báo "Đã gửi về trạm" → máy chủ chưa cho tài khoản `smartflood-gateway` **đọc** topic `.../model` (file `mosquitto/acl` trên máy chủ, nhờ anh mentor kiểm tra).

Thử xong: admin → **Xem / Sửa** `TEST-WOKWI` → ẩn trạm, để app không hiện trạm thử.

| Serial Monitor báo | Nghĩa là |
|---|---|
| `LOI, ma 5` | Sai mật khẩu MQTT |
| `LOI, ma -2` | Không tới được máy chủ (máy chủ tắt / cổng 1883 bị chặn) |
| `chua du 5 phut lich su` | Bình thường: 5 phút đầu chưa tính được tốc độ dâng nên chưa dự báo |
