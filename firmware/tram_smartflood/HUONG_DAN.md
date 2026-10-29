# Trạm SmartFlood — bản gửi thẳng lên máy chủ (bỏ LoRa)

`tram_smartflood.ino` viết lại từ code trạm hiện tại của nhóm IoT (`OneDrive\SmartFlood\esp\src`: `totally.cpp` đọc siêu âm A02YYUW + loadcell HX711, `wfi.cpp` lấy thủy triều Seamark, `gateway.cpp` tính mực nước từ khoảng cách), bỏ LoRa, gửi thẳng gói tin 3.0 lên `flood.agentwf.xyz`.

| Thông số | Lấy từ đâu | Gửi lên |
|---|---|---|
| Độ ngập | Siêu âm đo khoảng cách $d$ → $H = $ `CAO_CAM_BIEN_CM` $- d$ (trung bình các lần đo giữa 2 lần gửi) | `water_level_mm` |
| Tốc độ dâng | $(H_{\text{bây giờ}} - H_{\text{5 phút trước}}) / 5$ | `rise_rate_mm_min` |
| Lượng mưa | Loadcell cân nước mưa trong phễu: 1 kg trên 1 m² = 1 mm | `rain_mm` |
| Thủy triều | API Seamark trạm Sài Gòn (bảng triều của TT KTTV quốc gia), 10 phút lấy 1 lần | `tide_m` |
| Dự báo 5 phút | Công thức máy chủ gửi xuống | `predicted_water_level_mm`, `model_version` |

## Chạy giả lập trên Wokwi (không cần chip)

1. Vào https://wokwi.com → **New Project** → **ESP32**.
2. Tab `sketch.ino`: xóa hết, dán nội dung `tram_smartflood.ino`. (Đầu file đang để `#define GIA_LAP 1`.)
3. Tab `diagram.json`: xóa hết, dán nội dung `diagram.json` → hiện ESP32 + cảm biến siêu âm HC-SR04 + loadcell HX711.
4. **Library Manager** (biểu tượng sách) → **+** → thêm `PubSubClient`, `ArduinoJson`, `HX711 Arduino Library` (của bogde).
5. Tìm dòng `#define MQTT_PASS "DIEN_MAT_KHAU_MQTT"` (khoảng dòng 31) → điền mật khẩu MQTT.
6. Bấm ▶. Serial Monitor:
   ```
   ===== TRAM SMARTFLOOD TEST-WOKWI (GIA LAP) =====
   [WiFi] Dang noi..... OK
   [MQTT] Dang noi flood.agentwf.xyz:1883 ... OK
   [TRIEU] Tram Sai Gon: 2.38 m (+0.95 m/gio)
   [GUI] OK (khoang cach 100.0 cm): {"id":"TEST-WOKWI","water_level_mm":0,"rain_mm":0,"tide_m":2.38,...}
   ```
7. **Giả lập nước dâng:** bấm vào cảm biến HC-SR04 → kéo thanh trượt. `100 cm` = đường khô; kéo xuống `70 cm` = ngập 30 cm. 30 giây sau app/admin đổi theo.
8. **Giả lập mưa:** bấm vào loadcell (nếu Wokwi hiện ô chỉnh khối lượng) → tăng khối lượng. 0,1 kg = 5 mm mưa (phễu 0,02 m²).
9. App / trang admin: trạm **TEST-WOKWI** ở ĐH Bách Khoa.

⚠ **ĐỪNG bấm Save / Share** khi có mật khẩu trong code (project Wokwi miễn phí là công khai). Mạng ảo Wokwi bị Wokwi giám sát → thi xong nên đổi mật khẩu `smartflood-gateway`.

### Thử trọn vòng học lại công thức

Chạy ~20 phút, thỉnh thoảng kéo thanh trượt (nước phải > 0 và có thay đổi) → admin → **Xem / Sửa** `TEST-WOKWI` → **Học lại ngay** → Serial hiện `[MODEL] Nhan cong thuc v1 ...`, các tin sau có `predicted_water_level_mm`. Không thấy `[MODEL]` dù admin báo đã gửi → máy chủ chưa cho `smartflood-gateway` đọc topic `.../model` (hỏi anh mentor file `mosquitto/acl`).

Thử xong: admin → ẩn trạm `TEST-WOKWI`.

## Nạp vào trạm thật

1. Đổi `#define GIA_LAP 1` → `0` (dùng A02YYUW chân RX 32 / TX 33, HX711 DT 13 / SCK 12 như code cũ; mã trạm `A01`; 5 phút gửi 1 lần).
2. Chép `secrets.example.h` thành `secrets.h`, điền Wi-Fi + mật khẩu MQTT. Thêm `secrets.h` vào `.gitignore`.
3. **Sửa 2 số theo thực tế:**
   - `CAO_CAM_BIEN_CM`: khoảng cách từ cảm biến xuống **mặt đường khô** (đang để 100).
   - `DIEN_TICH_PHEU_M2`: diện tích miệng phễu hứng mưa (đang để 0,02 m² ≈ phễu Ø16 cm). `HE_SO_HX711` cần hiệu chuẩn lại với loadcell thật.
4. PlatformIO: chép file thành `src/main.cpp`. Các file khác trong `src/` (`gateway.cpp`, `wfi.cpp`...) phải **comment hết `setup()`/`loop()`**, không thì báo lỗi trùng hàm.
5. Lúc bật máy, **phễu mưa phải rỗng** (code tự cân chỉnh ZERO khi khởi động).

| Serial báo | Nghĩa là |
|---|---|
| `LOI, ma 5` | Sai mật khẩu MQTT |
| `LOI, ma -2` | Không tới được máy chủ (Wi-Fi không có Internet / cổng 1883 bị chặn) |
| `[TRIEU] Loi HTTP ...` | Không lấy được triều → máy chủ sẽ từ chối tin (triều bắt buộc) |
| `Chua co so do sieu am hop le` | Siêu âm chưa trả dữ liệu: kiểm tra dây RX/TX |
| `chua du 5 phut lich su` | Bình thường: 5 phút đầu chưa có tốc độ dâng nên chưa dự báo |
