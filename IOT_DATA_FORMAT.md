# Đặc tả dữ liệu node → máy chủ SmartFlood

> Gửi cho **bên IoT** (firmware node + gateway LoRa). Phiên bản 1.0, ngày 25/10/2026.
> Backend nhận đúng định dạng dưới đây. Tin nhắn sai định dạng **không bị mất âm thầm**: máy chủ ghi lại kèm lý do ở trang `/admin` → **Tin nhắn lỗi**.

---

## 1. Dữ liệu đi đường nào

```
Node (ESP32 + cảm biến)  ──LoRa──▶  Gateway  ──MQTT──▶  Máy chủ (Mosquitto → backend → PostgreSQL)  ──▶  App / trang admin
   tự đo, tự dự đoán,                gói lại thành
   tự học công thức                  1 tin nhắn JSON
```

- **Mỗi lần đo = 1 tin nhắn JSON**, gateway publish lên MQTT.
- Mỗi node **tự tính dự đoán** và **tự học lại công thức** trên thiết bị (cách A đã chốt). Máy chủ chỉ **lưu và hiển thị**, không học thay node.

## 2. Kết nối MQTT

| Mục | Giá trị |
|---|---|
| Địa chỉ | địa chỉ máy chủ anh mentor đưa, cổng **1883** |
| Tài khoản | `smartflood-gateway` |
| Mật khẩu | anh mentor đưa riêng (**không** ghi vào code đưa lên GitHub) |
| Topic | `smartflood/nodes/<node_id>/data` — ví dụ `smartflood/nodes/ND-Q1-01/data` |
| QoS | **1** (máy chủ chống lưu trùng nếu tin bị gửi lại) |
| Retain | `false` |
| Nội dung | JSON, mã hóa UTF-8, tối đa 16 KB |

Tài khoản gateway **chỉ được ghi** vào `smartflood/nodes/+/data`, không đọc được dữ liệu node khác.

## 3. Các trường của tin nhắn

### 3.1. Bắt buộc

| Trường | Kiểu | Đơn vị | Khoảng hợp lệ | Ý nghĩa |
|---|---|---|---|---|
| `flood_depth_cm` | số | cm | −20 → 500 | **Độ sâu nước ngập trên mặt đường** tại node. `0` = khô. Node tự tính = (khoảng cách cảm biến → mặt đường lúc khô) − (khoảng cách đo được). Số âm nhỏ do nhiễu vẫn nhận, app hiển thị là 0. |
| `rain_mm_1h` | số | mm | 0 → 500 | **Tổng lượng mưa trong 60 phút gần nhất** (cộng dồn trượt, không phải từ đầu ngày). |
| `tide_cm` | số | cm | −1000 → 1000 | **Mực triều**, cm, theo hệ cao độ quốc gia. Node không tự đo được thì gateway điền từ bảng triều. |

Thêm **mã node**: ghi `node_id` trong tin nhắn **hoặc** để trong topic. Nếu có cả 2 thì phải giống nhau.

| Trường | Kiểu | Quy định |
|---|---|---|
| `node_id` | chuỗi | Chữ không dấu, số, `-`, `_`, `.`; tối đa 64 ký tự. Ví dụ `ND-Q1-01`. **Mỗi node 1 mã cố định, không đổi.** |

### 3.2. Nên có

| Trường | Kiểu | Đơn vị | Khoảng | Ý nghĩa |
|---|---|---|---|---|
| `measured_at` | chuỗi ISO 8601 **hoặc** số Unix | — | — | Thời điểm đo. Xem mục 4. |
| `temperature_c` | số | °C | −20 → 80 | Nhiệt độ |
| `humidity_pct` | số | % | 0 → 100 | Độ ẩm |
| `light_lux` | số | lux | 0 → 200000 | Ánh sáng |
| `battery_pct` | số | % | 0 → 100 | Pin còn lại |
| `rssi_dbm` | số | dBm | −200 → 0 | Cường độ sóng LoRa gateway đo được khi nhận gói của node |
| `prediction` | object | | | Kết quả dự đoán node tự tính, xem 3.3 |
| `model` | object | | | Công thức node đang dùng, xem 3.4 |
| `location` | object | độ | | `{ "lat": 10.7769, "lng": 106.7009 }`. Chỉ dùng khi node **chưa có vị trí** trên máy chủ (admin đã đặt vị trí thì giữ vị trí admin). |

**Không có giá trị thì BỎ TRƯỜNG ĐÓ ĐI hoặc ghi `null`. Tuyệt đối không ghi `0` thay cho "không đo được"**, vì máy chủ sẽ hiểu là đo được 0 thật.

Trường nào **không có trong bảng** (vd `fw_version`, `snr_db`) vẫn được nhận và lưu nguyên vào cột `extra`, sau này cần thì dùng.

### 3.3. `prediction`: kết quả dự đoán

```json
"prediction": { "depth_cm": 15.1, "horizon_min": 5 }
```

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `depth_cm` | số (cm) | Độ sâu ngập node dự đoán sau `horizon_min` phút |
| `horizon_min` | số nguyên 1 → 1440 | Dự đoán trước bao nhiêu phút (báo cáo dùng **5 phút**) |

### 3.4. `model`: công thức node đang dùng

Công thức theo báo cáo, hồi quy tuyến tính dự đoán mực nước sau 5 phút:

$$\hat{H}(t+5) = b_0 + b_H\,H + b_V\,V + b_T\,T + b_{RH}\,RH + b_L\,L$$

| Ký hiệu trong `coef` | Biến |
|---|---|
| `H` | mực nước / độ sâu ngập hiện tại (cm) |
| `V` | tốc độ dâng (cm/phút) |
| `T` | nhiệt độ (°C) |
| `RH` | độ ẩm (%) |
| `L` | ánh sáng (lux) |
| *(dự phòng)* `R`, `S` | mưa, triều, nếu sau này đưa vào công thức |

```json
"model": {
  "version": 1,
  "trained_at": "2026-10-01T00:00:00+07:00",
  "samples": 0,
  "horizon_min": 5,
  "intercept": 0.15,
  "coef": { "H": 0.985, "V": 4.8, "T": 0.002, "RH": 0.001, "L": -0.00001 },
  "mae_cm": 0.344,
  "rmse_cm": 0.439,
  "r2": 0.995
}
```

| Trường | Bắt buộc trong `model` | Ý nghĩa |
|---|---|---|
| `version` | ✔ | Số nguyên ≥ 1. **v1 = công thức chung ban đầu, giống nhau ở mọi node.** Mỗi lần node học lại xong thì **tăng lên 1**. |
| `intercept` | ✔ | Hệ số tự do $b_0$ |
| `coef` | ✔ | Hệ số từng biến, 1 → 20 hệ số, tên viết như bảng trên |
| `trained_at` | | Lúc node học xong phiên bản này |
| `samples` | | Học từ bao nhiêu mẫu |
| `horizon_min` | | Dự đoán trước bao nhiêu phút |
| `mae_cm`, `rmse_cm`, `r2` | | Sai số của phiên bản này, **node tự tính** trên dữ liệu của nó |

**Khi nào gửi `model`:** đơn giản nhất là gửi kèm **mọi tin nhắn**. Gói LoRa nhỏ thì tối thiểu gửi **ở tin nhắn đầu tiên sau khi bật máy** và **ngay sau mỗi lần học lại** (version mới). Máy chủ giữ **tất cả phiên bản**, nên app và admin xem được công thức mỗi node thay đổi ra sao theo thời gian. Đây là phần chứng minh "mỗi node tự học công thức riêng".

Mỗi tin nhắn có `prediction` thì nên kèm `model.version` (hoặc cả `model`), để biết dự đoán đó tính bằng công thức nào.

## 4. Thời gian (`measured_at`)

Nhận 3 dạng:

| Dạng | Ví dụ | Máy chủ hiểu là |
|---|---|---|
| ISO 8601 có múi giờ (**khuyên dùng**) | `"2026-10-25T14:05:00+07:00"` hoặc `"2026-10-25T07:05:00Z"` | đúng múi giờ ghi |
| ISO không ghi múi giờ | `"2026-10-25 14:05:00"` | **giờ Việt Nam (+07:00)** |
| Số Unix | `1792911900` (giây) hoặc `1792911900000` (mili-giây) — cùng là 14:05 ngày 25/10/2026 giờ VN | giờ UTC chuẩn |

- **Tin nhắn trực tiếp qua MQTT:** thiếu `measured_at`, hoặc giờ sai (nhanh hơn giờ máy chủ quá 5 phút, hay năm 1970/2000 do ESP32 chưa chỉnh giờ), thì máy chủ **vẫn nhận** nhưng dùng giờ máy chủ, đồng thời ghi giờ sai vào `extra.device_measured_at_rejected` để bên IoT biết đồng hồ node đang sai.
- **Nhập dữ liệu cũ (mục 7):** `measured_at` **bắt buộc và phải đúng**, sai thì từ chối dòng đó.
- 2 tin nhắn **cùng node, cùng `measured_at`** thì coi là trùng, chỉ lưu 1 lần.

## 5. Ví dụ

**Đầy đủ** (file `examples/node-message.example.json`):

```json
{
  "node_id": "ND-Q1-01",
  "measured_at": "2026-10-25T14:05:00+07:00",
  "flood_depth_cm": 12.5,
  "rain_mm_1h": 18.2,
  "tide_cm": 135,
  "temperature_c": 29.4,
  "humidity_pct": 86,
  "light_lux": 1200,
  "battery_pct": 78,
  "rssi_dbm": -97,
  "prediction": { "depth_cm": 15.1, "horizon_min": 5 },
  "model": {
    "version": 1, "trained_at": "2026-10-01T00:00:00+07:00", "samples": 0, "horizon_min": 5,
    "intercept": 0.15,
    "coef": { "H": 0.985, "V": 4.8, "T": 0.002, "RH": 0.001, "L": -0.00001 },
    "mae_cm": 0.344, "rmse_cm": 0.439, "r2": 0.995
  },
  "location": { "lat": 10.7769, "lng": 106.7009 },
  "fw_version": "1.0.3"
}
```

**Tối thiểu** (mã node có trong topic hoặc trong tin, giờ đo lấy giờ máy chủ):

```json
{ "node_id": "ND-Q1-01", "flood_depth_cm": 0, "rain_mm_1h": 0, "tide_cm": 120 }
```

## 6. Thử trước khi nối gateway

**Cách 1: trang admin, không cần MQTT.** Mở `http://<máy-chủ>:3000/admin`, nhập khóa admin, vào tab **Gửi thử · Thêm node**, dán JSON rồi bấm **Gửi**. Trang báo **✓ Đã lưu** hoặc **✗ Bị từ chối: <lý do>**.

**Cách 2: dòng lệnh, không cần MQTT:**

```bash
curl -X POST http://<máy-chủ>:3000/api/v1/admin/messages \
  -H "Content-Type: application/json" -H "x-admin-key: <KHÓA_ADMIN>" \
  -d '{"message": {"node_id":"ND-THU-01","flood_depth_cm":5,"rain_mm_1h":10,"tide_cm":120}}'
```

**Cách 3: qua MQTT thật** (máy có cài `mosquitto-clients`):

```bash
mosquitto_pub -h <máy-chủ> -p 1883 -u smartflood-gateway -P '<mật khẩu>' -q 1 \
  -t smartflood/nodes/ND-THU-01/data \
  -m '{"flood_depth_cm":5,"rain_mm_1h":10,"tide_cm":120}'
```

Gửi xong, trang admin tab **Các node** sẽ thấy node `ND-THU-01` xuất hiện. Node lạ được **tự tạo**, chỉ cần vào **Xem / Sửa** để điền tên và vị trí.

Lý do bị từ chối hay gặp (xem ở tab **Tin nhắn lỗi**):

| Lý do | Sửa |
|---|---|
| `Không phải JSON hợp lệ` | Thiếu dấu ngoặc / dấu phẩy, hoặc dùng dấu `'` thay cho `"` |
| `tide_cm: thiếu trường bắt buộc` | Thêm đủ 3 trường bắt buộc |
| `rain_mm_1h: phải ≥ 0` | Giá trị ngoài khoảng hợp lệ (mục 3) |
| `flood_depth_cm: phải là số` | Gửi chữ như `"abc"` hoặc `"N/A"`. Không có số thì bỏ trường/ghi `null` (riêng 3 trường bắt buộc thì phải có số) |
| `node_id "A" khác mã node trong topic "B"` | Mã trong tin và trong topic phải giống nhau |

## 7. Nhập dữ liệu đã đo trước đó vào DB

Định dạng **giống hệt tin nhắn MQTT**, nhưng **bắt buộc có `measured_at`**. Nhận 3 kiểu file:

- `.json`: mảng `[ {...}, {...} ]` (xem `examples/import-sample.json`)
- `.jsonl`: mỗi dòng 1 object JSON
- `.csv`: dòng đầu là tên cột. Cột lồng nhau viết bằng dấu chấm: `prediction.depth_cm`, `model.coef.H`… (xem `examples/import-sample.csv`). Ô trống = không có dữ liệu, không phải 0. Lưu từ Excel dạng **CSV UTF-8**.

Chạy (trong thư mục backend):

```bash
npm run import -- du-lieu.csv --api http://<máy-chủ>:3000 --key <KHÓA_ADMIN>
```

Nhập lại cùng file **không bị trùng**. Dòng nào sai thì script in ra số dòng và lý do.

## 8. Checklist cho bên IoT

- [ ] Mỗi node có `node_id` cố định, không trùng nhau
- [ ] Gửi đủ 3 trường bắt buộc, đúng đơn vị (cm, mm 60 phút, cm)
- [ ] Không đo được thì bỏ trường / `null`, **không ghi 0**
- [ ] `measured_at` có múi giờ; ESP32 chỉnh giờ (NTP qua gateway) trước khi gửi
- [ ] `prediction` + `model.version` kèm mỗi tin; `model` đầy đủ khi bật máy và sau mỗi lần học lại
- [ ] `model.version` tăng 1 sau mỗi lần học lại; v1 là công thức chung
- [ ] QoS 1, topic `smartflood/nodes/<node_id>/data`
- [ ] Đã gửi thử và thấy **✓ Đã lưu** ở trang admin
