# Đặc tả dữ liệu node → máy chủ SmartFlood

> Gửi cho **bên IoT** (firmware node + gateway LoRa). **Phiên bản 2.0, ngày 26/10/2026** — theo gói tin thật của trạm A01, A02.
> Tin nhắn sai định dạng **không bị mất âm thầm**: máy chủ ghi lại kèm lý do ở trang `/admin` → **Tin nhắn lỗi**.
>
> **Đổi gì so với bản 1.0:** dùng đúng tên + đơn vị bên IoT đang gửi (`water_level_mm`, `rain_mm`, `rain_rate_mm_s`, `tide_m`, giờ `hh:mm:ss`), máy chủ tự đổi đơn vị. Dự đoán / công thức **không bắt buộc** nữa. Kiểu tin nhắn bản 1.0 vẫn nhận (mục 3.4).

---

## 1. Dữ liệu đi đường nào

```
Node (ESP32 + cảm biến)  ──LoRa──▶  Gateway  ──MQTT──▶  Máy chủ (Mosquitto → backend → PostgreSQL)  ──▶  App / trang admin
                                    gói lại thành
                                    1 tin nhắn JSON
```

- **Mỗi lần đo = 1 tin nhắn JSON**, gateway publish lên MQTT.
- Máy chủ **nhận, đổi đơn vị, lưu và hiển thị**: mức ngập (An toàn / Cảnh báo / Nguy hiểm / Rất nguy hiểm), mưa, triều, nhiệt độ, lịch sử đo.
- Phần **dự đoán** chưa chốt (xem mục 8). Node chưa gửi dự đoán thì app ghi "Trạm chưa có dự đoán".

## 2. Kết nối MQTT

| Mục | Giá trị |
|---|---|
| Địa chỉ | địa chỉ máy chủ anh mentor đưa, cổng **1883** |
| Tài khoản | `smartflood-gateway` |
| Mật khẩu | anh mentor đưa riêng (**không** ghi vào code đưa lên GitHub) |
| Topic | `smartflood/nodes/<id>/data` — ví dụ `smartflood/nodes/A01/data` |
| QoS | **1** (máy chủ chống lưu trùng nếu tin bị gửi lại) |
| Retain | `false` |
| Nội dung | JSON, mã hóa UTF-8, tối đa 16 KB |

Tài khoản gateway **chỉ được ghi** vào `smartflood/nodes/+/data`, không đọc được dữ liệu node khác.

## 3. Các trường của tin nhắn

### 3.1. Gói tin bên IoT gửi (bản 2.0)

| Thông tin (bên IoT gọi) | Trường JSON | Kiểu | Đơn vị node gửi | Khoảng hợp lệ | Máy chủ lưu thành |
|---|---|---|---|---|---|
| ID | `id` | chuỗi | — | chữ không dấu, số, `-` `_` `.`; ≤ 64 ký tự | mã node, vd `A01` |
| Cao độ mực nước ngập | `water_level_mm` | số | **mm** | −200 → 5000 | ÷ 10 → **cm** (dùng để tính mức ngập) |
| Lượng mưa | `rain_mm` | số | **mm** | 0 → 100000 | giữ nguyên **mm** |
| Lưu lượng mưa | `rain_rate_mm_s` | số | **mm/giây** | 0 → 1 | × 3600 → **mm/giờ** (cường độ mưa) |
| Thủy triều | `tide_m` | số | **m** | −10 → 10 | × 100 → cm; app hiển thị lại theo **m** |
| Nhiệt độ | `temperature_c` | số | **°C** | −20 → 80 | giữ nguyên |
| Thời gian thực | `time` | chuỗi | `"hh:mm:ss"` | 00:00:00 → 23:59:59 | ghép với ngày hôm nay (mục 4) |

**Bắt buộc** (thiếu thì tin nhắn bị từ chối):

- **mã node**: `id` trong tin nhắn **hoặc** trong topic (có cả 2 thì phải giống nhau). **Mỗi node 1 mã cố định**, vd `A01`, `A02`.
- **mực nước ngập**: `water_level_mm`
- **mưa**: ít nhất 1 trong `rain_mm`, `rain_rate_mm_s` (nên gửi cả 2)
- **thủy triều**: `tide_m`

**Nên có:** `time`, `temperature_c`.

**Không đo được thì BỎ TRƯỜNG ĐÓ ĐI hoặc ghi `null`. Tuyệt đối không ghi `0` thay cho "không đo được"**, vì máy chủ sẽ hiểu là đo được 0 thật (vd mưa = 0 là "trời không mưa").

Số gửi dạng chuỗi (`"125"`, `"1.35"`) cũng nhận. Trường nào **không có trong bảng** (vd `fw_version`, `snr_db`) vẫn được nhận và lưu nguyên vào cột `extra`, sau này cần thì dùng.

### 3.2. Có thể gửi thêm (không bắt buộc)

| Trường | Kiểu | Đơn vị | Khoảng | Ý nghĩa |
|---|---|---|---|---|
| `date` | chuỗi | — | — | Ngày đo: `"2026-10-26"` hoặc `"26/10/2026"`. Có thì máy chủ không phải tự đoán ngày (mục 4) |
| `rain_rate_mm_h` | số | mm/giờ | 0 → 3600 | Thay cho `rain_rate_mm_s` nếu tiện hơn (chỉ gửi 1 trong 2) |
| `humidity_pct` | số | % | 0 → 100 | Độ ẩm |
| `light_lux` | số | lux | 0 → 200000 | Ánh sáng |
| `battery_pct` | số | % | 0 → 100 | Pin còn lại |
| `rssi_dbm` | số | dBm | −200 → 0 | Cường độ sóng LoRa gateway đo được |
| `location` | object | độ | | `{ "lat": 10.7769, "lng": 106.7009 }` — chỉ dùng khi node **chưa có vị trí** trên máy chủ (admin đặt vị trí rồi thì giữ vị trí admin) |
| `prediction`, `model` | object | | | Dự đoán + công thức, **nếu sau này node tự dự đoán** — xem Phụ lục |

App **ẩn** mục nào node không gửi (vd A01, A02 không gửi độ ẩm → app không hiện ô độ ẩm).

### 3.3. Mức ngập tính thế nào

Máy chủ so **độ sâu nước ngập (cm)** = `water_level_mm ÷ 10` với ngưỡng của từng node (admin sửa được, mặc định):

| Độ sâu | Mức |
|---|---|
| < 10 cm | An toàn |
| 10 → < 25 cm | Cảnh báo |
| 25 → < 40 cm | Nguy hiểm |
| ≥ 40 cm | Rất nguy hiểm |

> ⚠ Máy chủ đang hiểu `water_level_mm` là **độ sâu nước trên mặt đường (đường khô = 0)**. Nếu thật ra là cao độ so với 1 mốc khác thì mức ngập sẽ sai — xem câu hỏi 1, mục 8.

### 3.4. Kiểu tin nhắn bản 1.0 (vẫn nhận)

| Bản 2.0 | Bản 1.0 tương đương |
|---|---|
| `id` | `node_id` |
| `time` (+ `date`) | `measured_at` (ISO 8601 hoặc số Unix) |
| `water_level_mm` (mm) | `flood_depth_cm` (cm) |
| `tide_m` (m) | `tide_cm` (cm) |
| `rain_mm`, `rain_rate_mm_s` | `rain_mm_1h` (tổng mưa 60 phút gần nhất, mm) |

**Chỉ gửi 1 trong 2 tên** cho cùng 1 thông tin. Gửi cả `tide_m` lẫn `tide_cm` thì bị từ chối (dễ nhầm đơn vị). Ví dụ bản 1.0: `examples/node-message.old-format.example.json`.

## 4. Thời gian

| Node gửi | Ví dụ | Máy chủ hiểu là |
|---|---|---|
| Chỉ có giờ (**đang dùng**) | `"time": "14:05:30"` hoặc `"14/05/30"` | **giờ Việt Nam, ngày hôm nay** (lúc máy chủ nhận) |
| Giờ + ngày | `"time": "14:05:30", "date": "2026-10-26"` | đúng ngày giờ đó, giờ Việt Nam |
| ISO 8601 / số Unix (bản 1.0) | `"2026-10-26T14:05:30+07:00"`, `1792998330` | đúng múi giờ ghi |

Khi node **chỉ gửi giờ**, máy chủ phải tự ghép ngày nên có mấy quy tắc an toàn:

- Gần nửa đêm: node đo lúc `23:59:58`, tới máy chủ lúc `00:00:03` hôm sau → máy chủ tự lùi về **hôm qua**.
- Giờ node **nhanh hơn** giờ máy chủ quá 5 phút, hoặc **chậm hơn** quá 15 phút (vd node mới bật, đồng hồ về `00:00:00`) → coi là đồng hồ node sai, **vẫn nhận tin** nhưng dùng giờ máy chủ, đồng thời ghi giờ node vào `extra.device_time_rejected` để bên IoT biết.
- Không gửi `time` → dùng giờ máy chủ nhận.
- 2 tin nhắn **cùng node, cùng thời điểm đo** thì coi là trùng, chỉ lưu 1 lần.
- **Nhập dữ liệu cũ (mục 7):** bắt buộc có **cả ngày lẫn giờ** (`date` + `time`), vì không thể đoán ngày.

Cách xử lý thời gian sẽ chốt lại sau khi bên IoT trả lời câu hỏi 3, mục 8.

## 5. Ví dụ

**Đúng gói tin bên IoT gửi** (file `examples/node-message.example.json`):

```json
{
  "id": "A01",
  "time": "14:05:30",
  "water_level_mm": 125,
  "rain_mm": 12.5,
  "rain_rate_mm_s": 0.004,
  "tide_m": 1.35,
  "temperature_c": 29.4
}
```

Máy chủ lưu thành: ngập **12.5 cm** (mức Cảnh báo), lượng mưa **12.5 mm**, cường độ mưa **14.4 mm/giờ**, triều **1.35 m**, nhiệt độ 29.4 °C, đo lúc 14:05:30 hôm nay.

**Tối thiểu** (file `examples/node-message.minimal.json`, giờ đo lấy giờ máy chủ):

```json
{ "id": "A01", "water_level_mm": 0, "rain_mm": 0, "tide_m": 1.2 }
```

## 6. Thử trước khi nối gateway

**Cách 1: trang admin, không cần MQTT.** Mở `http://<máy-chủ>:3000/admin`, nhập khóa admin, vào tab **Gửi thử · Thêm node**: ô nhập đã có sẵn 1 gói tin mẫu đúng kiểu bản 2.0, sửa số rồi bấm **Gửi**. Trang báo **✓ Đã lưu** hoặc **✗ Bị từ chối: <lý do>**.

**Cách 2: dòng lệnh, không cần MQTT:**

```bash
curl -X POST http://<máy-chủ>:3000/api/v1/admin/messages \
  -H "Content-Type: application/json" -H "x-admin-key: <KHÓA_ADMIN>" \
  -d '{"message": {"id":"ND-THU-01","time":"14:05:30","water_level_mm":125,"rain_mm":12.5,"rain_rate_mm_s":0.004,"tide_m":1.35,"temperature_c":29.4}}'
```

**Cách 3: qua MQTT thật** (máy có cài `mosquitto-clients`):

```bash
mosquitto_pub -h <máy-chủ> -p 1883 -u smartflood-gateway -P '<mật khẩu>' -q 1 \
  -t smartflood/nodes/ND-THU-01/data \
  -m '{"water_level_mm":125,"rain_mm":12.5,"rain_rate_mm_s":0.004,"tide_m":1.35,"temperature_c":29.4}'
```

> Gửi thử thì dùng mã kiểu `ND-THU-01`, **đừng dùng `A01`/`A02`** — không thì dữ liệu thử lẫn vào trạm thật.

Gửi xong, trang admin tab **Các node** sẽ thấy node xuất hiện. Node lạ được **tự tạo**, chỉ cần vào **Xem / Sửa** để điền tên và **vị trí** (A01, A02 không gửi tọa độ nên admin phải nhập tay, không thì trạm không hiện trên bản đồ).

Lý do bị từ chối hay gặp (xem ở tab **Tin nhắn lỗi**):

| Lý do | Sửa |
|---|---|
| `Không phải JSON hợp lệ` | Thiếu dấu ngoặc / dấu phẩy, hoặc dùng dấu `'` thay cho `"` |
| `tide_m: thiếu thủy triều (bắt buộc)` | Thêm đủ: mực nước, mưa, triều |
| `rain_mm: thiếu thông tin mưa` | Gửi ít nhất 1 trong `rain_mm`, `rain_rate_mm_s` |
| `rain_rate_mm_s: phải ≤ 1` | Có thể đang gửi nhầm mm/giờ vào trường mm/giây — dùng `rain_rate_mm_h` |
| `water_level_mm: phải là số` | Gửi chữ như `"abc"` hoặc `"N/A"`. Không đo được thì bỏ trường / ghi `null` |
| `tide_m và tide_cm: cùng là thủy triều, chỉ gửi 1 trường` | Chỉ giữ 1 tên trường |
| `id "A01" khác mã node trong topic "A02"` | Mã trong tin và trong topic phải giống nhau |

## 7. Nhập dữ liệu đã đo trước đó vào DB

Định dạng **giống hệt tin nhắn MQTT**, nhưng **bắt buộc có ngày + giờ** (`date` + `time`). Nhận 3 kiểu file:

- `.json`: mảng `[ {...}, {...} ]` (xem `examples/import-sample.json`)
- `.jsonl`: mỗi dòng 1 object JSON
- `.csv`: dòng đầu là tên cột, vd `id,date,time,water_level_mm,rain_mm,rain_rate_mm_s,tide_m,temperature_c` (xem `examples/import-sample.csv`). Ô trống = không có dữ liệu, không phải 0. Lưu từ Excel dạng **CSV UTF-8**.

Chạy (trong thư mục backend):

```bash
npm run import -- du-lieu.csv --api http://<máy-chủ>:3000 --key <KHÓA_ADMIN>
```

Nhập lại cùng file **không bị trùng**. Dòng nào sai thì script in ra số dòng và lý do.

## 8. Câu hỏi còn mở (cần bên IoT trả lời)

| # | Câu hỏi | Vì sao cần |
|---|---|---|
| 1 | **"Cao độ mực nước ngập"** là độ sâu nước trên mặt đường (đường khô = 0) hay cao độ so với 1 mốc nào đó? | Máy chủ đang lấy số này so ngưỡng 10 / 25 / 40 cm. Nếu là cao độ so với mốc thì cần biết cao độ mặt đường của từng trạm để trừ ra |
| 2 | **"Lượng mưa (mm)"** cộng dồn từ lúc nào: đầu ngày, lúc bật node, hay trong 1 khoảng thời gian cố định? Có reset không? | Để ghi đúng nhãn trên app ("mưa hôm nay" hay "mưa từ lúc bật") và tính được mưa trong 1 giờ |
| 3 | Gateway có **ngày tháng** (NTP / RTC) không? Gửi kèm `date` được không? | Hiện máy chủ phải tự đoán ngày (mục 4); có ngày thì chính xác hơn và nhập dữ liệu cũ được |
| 4 | **Thủy triều** đo so với mốc nào (hệ cao độ quốc gia, số 0 hải đồ…)? Node tự đo hay gateway lấy từ bảng triều? | Để ghi chú đúng trên app và so được với số liệu đài khí tượng |
| 5 | Node có **tự tính dự đoán / tự học hệ số** không? | Nếu có thì gửi theo Phụ lục. Nếu không thì cân nhắc để máy chủ tự học từ lịch sử đo (đang tính) |
| 6 | Bao lâu gửi 1 lần? **Tọa độ** (vĩ độ, kinh độ) và địa chỉ của A01, A02? | Chu kỳ gửi dùng để báo "Mất kết nối"; tọa độ để hiện trạm trên bản đồ |
| 7 | Xác nhận **tên trường JSON** như mục 3.1: `id`, `time`, `water_level_mm`, `rain_mm`, `rain_rate_mm_s`, `tide_m`, `temperature_c` | Sai 1 chữ là máy chủ báo thiếu trường |

## 9. Checklist cho bên IoT

- [ ] Mỗi node có `id` cố định, không trùng nhau (`A01`, `A02`…)
- [ ] Gửi đủ: mực nước (`water_level_mm`), mưa (`rain_mm` và/hoặc `rain_rate_mm_s`), triều (`tide_m`), đúng đơn vị bảng 3.1
- [ ] Không đo được thì bỏ trường / `null`, **không ghi 0**
- [ ] `time` dạng `"hh:mm:ss"` giờ Việt Nam; có ngày thì gửi thêm `date`
- [ ] QoS 1, topic `smartflood/nodes/<id>/data`
- [ ] Đã gửi thử và thấy **✓ Đã lưu** ở trang admin
- [ ] Đã trả lời các câu hỏi mục 8

---

## Phụ lục: nếu sau này node tự dự đoán (không bắt buộc)

Máy chủ đã sẵn chỗ lưu dự đoán và công thức của từng node (mỗi lần node học lại thì lưu thêm 1 phiên bản, xem được công thức thay đổi theo thời gian). Gửi kèm trong cùng tin nhắn:

```json
"prediction": { "depth_cm": 15.1, "horizon_min": 5 },
"model": {
  "version": 1,
  "trained_at": "2026-10-01T00:00:00+07:00",
  "samples": 0,
  "horizon_min": 5,
  "intercept": 0.15,
  "coef": { "H": 0.985, "V": 4.8, "T": 0.002 },
  "mae_cm": 0.344, "rmse_cm": 0.439, "r2": 0.995
}
```

Công thức theo báo cáo (hồi quy tuyến tính, dự đoán mực nước sau 5 phút):

$$\hat{H}(t+5) = b_0 + b_H\,H + b_V\,V + b_T\,T + b_{RH}\,RH + b_L\,L$$

| Trường | Bắt buộc | Ý nghĩa |
|---|---|---|
| `prediction.depth_cm` | ✔ | Độ sâu ngập node dự đoán (cm) sau `horizon_min` phút |
| `prediction.horizon_min` | ✔ | Dự đoán trước bao nhiêu phút (1 → 1440) |
| `model.version` | ✔ | Số nguyên ≥ 1. v1 = công thức chung, mỗi lần học lại tăng 1 |
| `model.intercept` | ✔ | Hệ số tự do $b_0$ |
| `model.coef` | ✔ | Hệ số từng biến, 1 → 20 hệ số. Tên: `H` mực nước (cm), `V` tốc độ dâng (cm/phút), `T` nhiệt độ, `RH` độ ẩm, `L` ánh sáng, `R` mưa, `S` triều |
| `model.trained_at`, `samples`, `horizon_min`, `mae_cm`, `rmse_cm`, `r2` | | Thông tin thêm về lần học |

Gói LoRa nhỏ thì không cần gửi `model` mọi lần: tối thiểu ở **tin nhắn đầu tiên sau khi bật máy** và **ngay sau mỗi lần học lại**.
