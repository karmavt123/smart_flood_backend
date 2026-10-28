# SmartFlood Backend

Máy chủ của hệ thống **SMARTFLOOD – IoT giám sát, cảnh báo sớm và hỗ trợ định tuyến tránh ngập đô thị**.

Viết mới hoàn toàn, **tách riêng khỏi backend của web smartflood.vn cũ**. Backend làm 3 việc:

1. **Nhận dữ liệu node** qua MQTT (gateway LoRa gửi lên) rồi lưu vào PostgreSQL.
2. **Cung cấp API cho app** (không cần đăng nhập): danh sách trạm, lịch sử, công thức từng node, tình hình ngập quanh vị trí người dùng, kiểm tra tuyến đường, cập nhật realtime.
3. **Trang admin** `/admin` để xem và quản lý node.

> **Bên IoT:** định dạng dữ liệu node phải gửi nằm ở **[IOT_DATA_FORMAT.md](IOT_DATA_FORMAT.md)** (bản 2.0, theo gói tin thật của trạm A01, A02).
> **Anh mentor deploy:** đọc **mục 3**.

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Chạy thử trên laptop](#2-chạy-thử-trên-laptop-không-cần-cài-database-hay-mqtt)
3. [Đưa lên máy chủ (Docker)](#3-đưa-lên-máy-chủ-docker)
4. [Danh sách API](#4-danh-sách-api)
5. [Cơ sở dữ liệu](#5-cơ-sở-dữ-liệu)
6. [Các quy tắc tính toán](#6-các-quy-tắc-tính-toán)
7. [Cây thư mục](#7-cây-thư-mục)
8. [Muốn sửa X thì sửa ở đâu](#8-muốn-sửa-x-thì-sửa-ở-đâu)
9. [Lỗi thường gặp](#9-lỗi-thường-gặp)
10. [Giới hạn hiện tại](#10-giới-hạn-hiện-tại-nói-thẳng-để-khỏi-bất-ngờ)

---

## 1. Tổng quan

```
 ┌──────────┐  LoRa  ┌─────────┐  MQTT (1883)  ┌────────────┐      ┌──────────────────────────────┐
 │  Node    │ ─────▶ │ Gateway │ ────────────▶ │ Mosquitto  │ ───▶ │ Backend (Node.js, cổng 3000) │
 │ ESP32    │        └─────────┘               └────────────┘      │  1. kiểm tra JSON            │
 │ tự đo,   │                                                      │  2. lưu PostgreSQL           │
 │ tự dự    │                                                      │  3. đẩy realtime (Socket.IO) │
 │ đoán, tự │                                                      └──────┬──────────────┬────────┘
 │ học công │                                                             │ API /api/v1  │ /admin
 │ thức     │                                                             ▼              ▼
 └──────────┘                                                       App SmartFlood   Trang admin
```

| Thành phần | Công nghệ |
|---|---|
| Ngôn ngữ | TypeScript chạy trên Node.js 22.13+ / 24 / 26 (cùng phiên bản với app) |
| Web API | Express 5 |
| Cơ sở dữ liệu | PostgreSQL 17. Khi chạy thử trên laptop dùng **PGlite**, là PostgreSQL nhúng sẵn trong backend nên không cần cài gì thêm |
| MQTT | Mosquitto trên máy chủ. Khi chạy thử dùng **aedes**, broker nhúng sẵn |
| Realtime | Socket.IO, sự kiện `station:update` |
| Kiểm tra dữ liệu | zod: báo lỗi tiếng Việt cho từng trường |
| Bản đồ ngoài | OSRM (tìm đường), Overpass/OpenStreetMap (hình dạng con đường để tô màu đường ngập) |

**Đã bỏ so với backend cũ** (theo yêu cầu): đăng nhập/đăng ký/OTP, email cảnh báo, điều khiển còi/bơm. App xem dữ liệu **không cần tài khoản**.

**Công thức dự đoán (cách A đã chốt):** mỗi node **tự học** trên thiết bị rồi gửi hệ số lên. Backend **không tự học**, chỉ **lưu mọi phiên bản** công thức của từng node (bảng `node_models`). App và admin nhờ đó cho thấy "lúc đầu mọi node dùng chung công thức v1, sau một thời gian mỗi node có công thức riêng".

---

## 2. Chạy thử trên laptop (không cần cài database hay MQTT)

Chỉ cần **Node.js** (đã cài khi làm app). Kiểm tra bằng `node -v`: phải ra `v22.13` trở lên, `v24.x` hoặc `v26.x`. **Không dùng bản số lẻ như v25.**

### Bước 1: Chép code ra ngoài OneDrive / iCloud

Giống app: **không** chạy `npm install` trong thư mục đang đồng bộ.

- Windows: chép `smartflood-backend` vào `C:\code\smartflood-backend` (hoặc `D:\Projects\...`)
- macOS / Linux: chép vào `~/Projects/smartflood-backend`

Mở terminal tại thư mục đó (Windows: chuột phải trong thư mục → *Open in Terminal*).

### Bước 2: Cài thư viện

```bash
npm install
```

✔ Thành công khi thấy `added ... packages`. Mất khoảng 1 phút.

### Bước 3: Bật backend

```bash
npm run dev
```

✔ Thành công khi thấy:

```
[db] Đã chạy 001_create_tables.sql
[db] Đã chạy 002_iot_packet_v2.sql
[db] Đang dùng PostgreSQL nhúng (./data/pglite)
[http] API:   http://localhost:3000/api/v1/stations
[http] Admin: http://localhost:3000/admin
[mqtt] Broker nhúng đang chạy ở mqtt://127.0.0.1:1883 (chỉ để chạy thử)
[mqtt] Đã kết nối mqtt://127.0.0.1:1883, nghe topic "smartflood/nodes/+/data"
```

**Để nguyên cửa sổ này.** Sửa code thì backend tự khởi động lại. Tắt bằng `Ctrl + C`.

### Bước 4: Giả lập node gửi dữ liệu

Mở **terminal thứ 2** (cũng ở thư mục backend):

```bash
npm run fake-node
```

Lệnh này tạo 2 node thử `TEST-A01` (chỗ trũng, dễ ngập) và `TEST-A02` quanh ĐH Bách Khoa, cứ 5 giây gửi 1 lần, **đúng kiểu gói tin bên IoT** (`water_level_mm`, `rain_mm`, `rain_rate_mm_s`, `tide_m`, `temperature_c`, giờ `hh:mm:ss`). Mưa giả lặp lại mỗi 10 phút: **5 phút mưa** (nước dâng) rồi **5 phút tạnh** (nước rút). Đợi khoảng 2–3 phút mới thấy ngập. Để chạy lâu cũng được, trên app sẽ thấy trạm đổi mức ngập qua lại. Thêm `--with-model` nếu muốn node thử gửi kèm dự đoán + công thức.

**Muốn node thử nằm quanh chỗ mình đang ngồi** (để màn "Quanh bạn" của app có dữ liệu): lấy tọa độ trên Google Maps (chuột phải lên bản đồ → bấm dòng số đầu tiên để chép), rồi chạy:

```bash
npm run fake-node -- --lat 10.80 --lng 106.68
```

Thay số bằng tọa độ của mình, **không gõ dấu `< >`**. Dấu `--` đứng một mình là bắt buộc (báo cho npm biết phần sau là của node giả).

- Tọa độ gõ vào là **tâm**. Node giả rải 2 trạm ra xung quanh để bản đồ thấy rõ 2 chấm: `TEST-A01` lệch 300 m về bắc + 200 m về đông, `TEST-A02` lệch 600 m về nam + 900 m về đông.
- ✔ Thành công khi thấy `[fake-node] Đã nối mqtt://127.0.0.1:1883. Gửi 2 node thử quanh (...)` và cứ 5 giây in thêm 1 dòng. Báo `ECONNREFUSED` → backend chưa chạy (Bước 3).
- Tắt bằng `Ctrl + C` (Windows hỏi `Terminate batch job (Y/N)?` thì gõ `Y` rồi Enter). Không nhận số mới quá 10 phút thì trạm chuyển sang "Chậm dữ liệu" rồi "Mất kết nối" — đó là app chạy đúng.
- **Đổi tọa độ thì 2 trạm tự dời theo.** Lúc khởi động, node giả in `Đặt TEST-A01 tại (...)`: nó dời 2 trạm thử tới chỗ mới bằng API admin (khóa `dev-admin-key`, hoặc `ADMIN_API_KEY` trong `.env`). Phải dùng API admin vì backend **không cho tin nhắn của node đổi vị trí trạm đã có**, để vị trí admin nhập cho trạm thật không bị ghi đè. Thấy báo `Không dời được ... (mã 401)` thì thêm `--key <khóa admin>`.

### Bước 5: Xem kết quả

- **Trang admin:** mở <http://localhost:3000/admin>, khóa là `dev-admin-key`.
- **API thô:** <http://localhost:3000/api/v1/stations>
- **App:** trong thư mục app, tạo/sửa file `.env.local` có dòng

  ```
  EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
  ```

  rồi chạy `npm run web` (xem README của app, mục "Chạy với backend mới").
  Chạy app trên **điện thoại** thì thay `localhost` bằng **IP của laptop** trong mạng Wi-Fi (Windows: `ipconfig` → *IPv4 Address*; macOS: `ipconfig getifaddr en0`), ví dụ `http://192.168.1.15:3000`.

### Bước 6 (tùy chọn): Demo gửi 1 gói tin, thấy app đổi ngay

Dùng khi thuyết trình / dạy: sửa số trong 1 gói tin, bấm Gửi, app trên trình duyệt đổi mức ngập ngay lập tức.

1. **Tắt node giả** (`Ctrl + C` ở cửa sổ node giả) — không thì 5 giây sau nó gửi đè số mới.
2. Mở <http://localhost:3000/admin> (khóa `dev-admin-key`) → tab **Gửi thử · Thêm node**. Ô bên trái có sẵn 1 gói tin mẫu đúng kiểu bên IoT.
3. Sửa `"id": "ND-THU-01"` thành `"id": "TEST-A01"` (trạm `ND-THU-01` **không có vị trí** nên chỉ hiện trong tab Trạm, không hiện trên bản đồ). Sửa `"water_level_mm": 125` thành `450`.
4. Bấm **"Đặt giờ đo = bây giờ"** rồi bấm **Gửi**. Mỗi lần gửi đều bấm "Đặt giờ đo = bây giờ" trước: 2 lần gửi cùng giờ đo bị coi là trùng và bỏ qua.
5. Kết quả hiện ngay dưới ô: `✓ Đã lưu cho node TEST-A01`. Báo `✗ Bị từ chối: ...` thường là lỡ xóa mất dấu `"` hoặc `,`.
6. Qua tab app: trạm TEST-A01 tự đổi thành **■ 45 cm – Rất nguy hiểm**, không cần tải lại trang. Gửi tiếp với `50` (5 cm) để thấy trạm về **An toàn**.
7. Demo xong, chạy lại node giả (Bước 4).

Thử gửi **thiếu `tide_m`** để thấy máy chủ từ chối và ghi lý do ở tab **Tin nhắn lỗi**.

### Xóa dữ liệu thử

Tắt backend (`Ctrl + C`), xóa thư mục `data/` trong thư mục backend, rồi bật lại:

```powershell
# Windows PowerShell, trong thư mục backend
Remove-Item -Recurse -Force .\data
npm run dev
```

macOS / Linux: `rm -rf data && npm run dev`. Trong `data/` chỉ có dữ liệu chạy thử trên laptop, máy chủ thật không bị ảnh hưởng.

---

## 3. Đưa lên máy chủ (Docker)

### Cần có

- Máy chủ Linux đã cài **Docker** và **Docker Compose v2** (lệnh `docker compose version` chạy được).
- Mở cổng **3000** (API + admin; hoặc 443 nếu đặt sau Caddy/Nginx) và **1883** (MQTT cho gateway).
- Máy chủ ra được Internet, để gọi `router.project-osrm.org` (tìm đường) và `overpass-api.de` (hình dạng con đường).

### Các bước

```bash
# 1. Chép thư mục smartflood-backend lên máy chủ (git clone / scp), rồi vào thư mục đó
cd smartflood-backend

# 2. Tạo file cấu hình từ mẫu và ĐỔI HẾT mật khẩu
cp .env.production.example .env
openssl rand -hex 24          # chạy 4 lần, lấy 4 chuỗi khác nhau dán vào .env
nano .env

# 3. Build và chạy (lần đầu mất vài phút)
docker compose up -d --build

# 4. Kiểm tra
docker compose ps                                   # 3 dịch vụ đều "running"/"healthy"
curl http://localhost:3000/api/v1/health            # "ok": true, database.kind = "postgres", mqtt.connected = true
docker compose logs -f api                          # xem log backend (Ctrl+C để thoát xem)
```

Mở `http://<IP-máy-chủ>:3000/admin` và nhập `ADMIN_API_KEY` trong `.env`.

### Cấu hình gateway LoRa

Đưa bên IoT: địa chỉ máy chủ, cổng `1883`, tài khoản `smartflood-gateway`, mật khẩu `MQTT_GATEWAY_PASSWORD`, topic `smartflood/nodes/<id>/data` (vd `smartflood/nodes/A01/data`). Chi tiết ở [IOT_DATA_FORMAT.md](IOT_DATA_FORMAT.md).

### Nên làm thêm (khuyên mạnh)

- **HTTPS bằng Caddy.** Có tên miền (vd `api.smartflood.vn`) trỏ về máy chủ thì thêm vào Caddyfile:

  ```
  api.smartflood.vn {
      reverse_proxy localhost:3000
  }
  ```

  Sau đó đặt `TRUST_PROXY=true` trong `.env`, chạy `docker compose up -d`, và đóng cổng 3000 ra ngoài.
- **Chỉ cho gateway vào cổng 1883:** `ufw allow from <IP gateway> to any port 1883`. MQTT hiện **chưa mã hóa (TLS)**; mật khẩu MQTT đi trên đường truyền dạng chữ thường.
- **Sao lưu DB định kỳ:**

  ```bash
  docker compose exec -T postgres pg_dump -U smartflood smartflood > backup-$(date +%F).sql
  ```

### Cập nhật code mới

```bash
# chép code mới đè lên (giữ nguyên file .env), rồi:
docker compose up -d --build
```

Dữ liệu nằm trong volume Docker `postgres-data` nên **không mất** khi build lại. Thay đổi cấu trúc bảng thì thêm file `sql/002_....sql`; backend tự chạy file mới khi khởi động.

---

## 4. Danh sách API

Gốc: `http://<máy-chủ>:3000/api/v1`. Mọi API trả JSON; lỗi trả dạng `{ "error": "câu tiếng Việt" }`.

### Công khai (app dùng, không cần đăng nhập)

| Phương thức | Đường dẫn | Dùng để |
|---|---|---|
| GET | `/health` | Máy chủ, DB, MQTT có ổn không |
| GET | `/stations` | Danh sách trạm + tình trạng mới nhất |
| GET | `/stations/:nodeId` | 1 trạm |
| GET | `/stations/:nodeId/readings?hours=24&limit=1000` | Lịch sử đo (cũ → mới), vẽ biểu đồ |
| GET | `/stations/:nodeId/models` | Các phiên bản công thức của node |
| GET | `/nearby?lat=..&lng=..&radius=2000` | **"Quanh bạn"**: trạm trong bán kính, kết luận, các đoạn đường bị ngập |
| POST | `/route/check` body `{start:{latitude,longitude}, end:{...}}` | Kiểm tra tuyến A→B, gợi ý tuyến tránh ngập |
| Socket.IO | sự kiện `station:update` | Trạm vừa có dữ liệu mới (gửi nguyên 1 trạm) |

`/nearby` giới hạn 60 lần/phút, `/route/check` giới hạn 20 lần/phút cho mỗi IP, để không bị dịch vụ OSRM/Overpass chặn.

Một trạm (`/stations`) trông như sau:

```json
{
  "nodeId": "ND-Q1-01", "name": "Ngã tư ...", "address": "", "latitude": 10.7769, "longitude": 106.7009,
  "thresholds": { "warningCm": 10, "dangerCm": 25, "criticalCm": 40 },
  "expectedIntervalSec": 300, "isActive": true,
  "connectionState": "online", "lastSeenAt": "2026-10-25T07:05:02.000Z",
  "floodLevel": "warning", "isFloodInfoUsable": true, "influenceRadiusM": 100, "predictedLevel": "warning",
  "latest": { "measuredAt": "...", "floodDepthCm": 12.5, "rainMm": 12.5, "rainRateMmH": 14.4, "rainMm1h": null,
              "tideCm": 135, "temperatureC": 29.4, "humidityPct": null, "lightLux": null, "batteryPct": null, "rssiDbm": null,
              "predictedDepthCm": null, "forecastMinutes": null, "modelVersion": null,
              "timeSource": "device", "source": "mqtt", "extra": { "device_time": "14:05:30", "date_from_server": true } },
  "model": null
}
```

Đây là trạm A01 gửi gói tin `{"id":"A01","time":"14:05:30","water_level_mm":125,"rain_mm":12.5,"rain_rate_mm_s":0.004,"tide_m":1.35,"temperature_c":29.4}`. Máy chủ đã đổi đơn vị: `floodDepthCm` = mm ÷ 10, `tideCm` = m × 100 (app hiển thị lại theo m), `rainRateMmH` = mm/s × 3600. `null` = node không gửi; `model: null` = node chưa gửi công thức.

### Admin (header `x-admin-key: <ADMIN_API_KEY>`)

| Phương thức | Đường dẫn | Dùng để |
|---|---|---|
| GET | `/admin/nodes` | Mọi node (kể cả node đang ẩn) + tình trạng MQTT |
| POST | `/admin/nodes` | Tạo node `{nodeId, name?, latitude?, longitude?, warningCm?, ...}` |
| PATCH | `/admin/nodes/:nodeId` | Sửa tên, vị trí, ngưỡng, chu kỳ gửi, ẩn/hiện |
| GET | `/admin/ingest-errors?limit=100` | Tin nhắn bị từ chối + lý do |
| POST | `/admin/messages` body `{message: {...}}` | Gửi thử 1 tin nhắn (không cần MQTT) |
| POST | `/admin/import` body `{messages: [...]}` | Nhập dữ liệu cũ (tối đa 5000 tin/lần; script `npm run import` tự chia nhỏ) |

---

## 5. Cơ sở dữ liệu

File tạo bảng: [`sql/001_create_tables.sql`](sql/001_create_tables.sql), thêm cột cho gói tin bên IoT: [`sql/002_iot_packet_v2.sql`](sql/002_iot_packet_v2.sql). Mỗi cột đều có chú thích tiếng Việt trong file.

```
nodes (1 dòng = 1 thiết bị)               readings (1 dòng = 1 lần đo)
─────────────────────────────            ──────────────────────────────────────
id  (PK, vd "ND-Q1-01")  ◀───────┬────── node_id (FK)
name, address                     │       measured_at, received_at, time_source
latitude, longitude               │       flood_depth_cm, tide_cm                  ← bắt buộc
                                  │       rain_mm, rain_rate_mm_h, rain_mm_1h      ← bắt buộc ít nhất 1
warning_cm, danger_cm, critical_cm│       temperature_c, humidity_pct, light_lux
expected_interval_sec             │       battery_pct, rssi_dbm
is_active, last_message_at        │       predicted_depth_cm, forecast_minutes, model_version
created_at, updated_at            │       source (mqtt/import/admin-test), extra (JSONB)
                                  │       UNIQUE (node_id, measured_at)  ← chống lưu trùng
                                  │
                                  │      node_models (1 dòng = 1 phiên bản công thức)
                                  │      ──────────────────────────────────────
                                  └───── node_id (FK)    ┐ khóa chính
                                         version         ┘ (v1 = công thức chung)
                                         intercept, coefficients (JSONB)
                                         horizon_minutes, samples, mae_cm, rmse_cm, r2
                                         trained_at, first_seen_at

ingest_errors: received_at, channel, topic, payload, reason   ← tin nhắn bị từ chối
schema_migrations: các file sql/ đã chạy
```

Chọn cách tổ chức này vì:

- **Tách `nodes` khỏi `readings`:** thông tin cố định (vị trí, ngưỡng) chỉ lưu 1 lần; mỗi lần đo chỉ thêm 1 dòng nhỏ.
- **Bảng `node_models` riêng, giữ mọi phiên bản:** đây là bằng chứng "mỗi node tự học công thức riêng". Xem được node nào đổi công thức lúc nào, sai số có giảm không.
- **Chỉ mục `(node_id, measured_at DESC)`:** lấy lần đo mới nhất hay lịch sử của 1 node đều nhanh, kể cả khi đã có hàng triệu dòng.
- **Cột `extra` (JSONB):** bên IoT gửi thêm trường mới thì không phải sửa DB.
- **Thiếu dữ liệu lưu `NULL`, không lưu `0`:** backend cũ biến "không đo được" thành 0 nên báo sai.

---

## 6. Các quy tắc tính toán

Tất cả nằm ở [`src/config/floodRules.ts`](src/config/floodRules.ts). Muốn đổi thì sửa ở đó.

| Quy tắc | Giá trị mặc định |
|---|---|
| **Mức ngập** theo độ sâu, so với 3 ngưỡng của từng node | < 10 cm An toàn · ≥ 10 Cảnh báo · ≥ 25 Nguy hiểm · ≥ 40 Rất nguy hiểm (sửa riêng từng node trong admin) |
| **Trạng thái kết nối** theo chu kỳ gửi của node (mặc định 300 s) | ≤ 2 chu kỳ: Đang hoạt động · ≤ 6 chu kỳ: Chậm dữ liệu · lâu hơn: Mất kết nối |
| **Vùng ảnh hưởng** quanh node đang ngập (ước lượng) | Cảnh báo 100 m · Nguy hiểm 200 m · Rất nguy hiểm 300 m |
| Node **mất kết nối** | Không vẽ vùng ngập, không dùng khi kiểm tra tuyến (backend cũ vẫn báo ngập theo dữ liệu cũ, đây là lỗi đã sửa) |
| **Đường ngập** (màn "Quanh bạn") | Lấy các con đường từ OpenStreetMap trong vùng ảnh hưởng, cắt đúng theo vòng tròn, tô theo mức ngập. Nhớ tạm 12 giờ |
| **"Quanh bạn"** kết luận | Có node ngập trong 2 km → *Có ngập gần bạn* · không có, nhưng có node đang hoạt động → *Chưa ghi nhận ngập* · không có node nào hoạt động → *Chưa đủ dữ liệu* (**không bao giờ** nói "an toàn" khi thiếu dữ liệu) |
| **Kiểm tra tuyến** | Vùng tránh = vùng ảnh hưởng + 50 m đệm; hỏi OSRM 1 lần lấy tối đa 4 tuyến, không có tuyến sạch thì thử đi vòng 2 bên vùng ngập (thêm 2 lần) |
| **Đổi đơn vị** gói tin bên IoT | `water_level_mm` ÷ 10 → cm · `tide_m` × 100 → cm · `rain_rate_mm_s` × 3600 → mm/giờ · `rain_mm` giữ nguyên |
| **Giờ đo** | Node chỉ gửi giờ (`"14:05:30"`) → ghép ngày hôm nay theo giờ VN (gần nửa đêm thì lùi về hôm qua). Giờ node nhanh hơn 5 phút hoặc chậm hơn 15 phút, hay thiếu giờ → dùng giờ máy chủ và ghi lại để bên IoT sửa |

---

## 7. Cây thư mục

Quy ước giống app: **mỗi file làm đúng 1 việc, tên file nói luôn việc đó**. ★ = file quan trọng nên đọc trước.

```
smartflood-backend/
├── .dockerignore                             # Những file không chép vào image Docker
├── .env.example                              # Mẫu cấu hình khi chạy thử trên laptop
├── .env.production.example                   # Mẫu cấu hình máy chủ (mật khẩu DB, MQTT, khóa admin)
├── .gitignore                                # Những file KHÔNG đưa lên Git (.env, node_modules, data/)
├── .nvmrc                                    # Phiên bản Node cần dùng: 24
├── Dockerfile                                # Đóng gói backend thành image Docker
├── IOT_DATA_FORMAT.md                        # ★ Đặc tả JSON node gửi lên — đưa cho bên IoT
├── README.md                                 # Bạn đang đọc file này
├── docker-compose.yml                        # ★ Chạy trên máy chủ: PostgreSQL + Mosquitto + backend
├── package-lock.json                         # Khóa đúng phiên bản thư viện (tự tạo, không sửa)
├── package.json                              # Danh sách thư viện + lệnh chạy (npm run dev...)
├── tsconfig.build.json                       # Cấu hình dịch TypeScript → dist/ để chạy trên máy chủ
├── tsconfig.json                             # Cấu hình TypeScript (kiểm tra lỗi kiểu)
├── examples/
│   ├── import-sample.csv                     # Ví dụ file CSV để nhập dữ liệu cũ
│   ├── import-sample.json                    # Ví dụ file JSON để nhập dữ liệu cũ
│   ├── node-message.example.json             # ★ Ví dụ đúng gói tin bên IoT gửi (trạm A01)
│   ├── node-message.minimal.json             # Ví dụ tin nhắn tối thiểu (ngập + mưa + triều)
│   └── node-message.old-format.example.json  # Ví dụ tin nhắn kiểu cũ (bản 1.0) — vẫn nhận
├── mosquitto/
│   ├── acl                                   # Quyền MQTT: gateway chỉ ghi, backend chỉ đọc
│   └── mosquitto.conf                        # Cấu hình broker MQTT (bắt buộc đăng nhập)
├── public/
│   └── admin/
│       ├── admin.css                         # Trang admin: màu sắc, bố cục
│       ├── admin.js                          # ★ Trang admin: xem node, sửa vị trí/ngưỡng, tin nhắn lỗi, gửi thử
│       └── index.html                        # Trang admin: khung giao diện
├── scripts/
│   ├── fakeNodePublisher.ts                  # GIẢ LẬP 2 NODE TEST-A01, TEST-A02 gửi đúng kiểu gói tin IoT (npm run fake-node)
│   └── importReadings.ts                     # NHẬP DỮ LIỆU CŨ từ file .json/.jsonl/.csv (npm run import)
├── sql/
│   ├── 001_create_tables.sql                 # ★ Tạo 4 bảng: nodes, readings, node_models, ingest_errors
│   └── 002_iot_packet_v2.sql                 # Thêm cột lượng mưa + cường độ mưa cho gói tin bên IoT (26/10)
└── src/
    ├── config/
    │   ├── appConfig.ts                      # Toàn bộ cấu hình, đọc từ file .env
    │   ├── floodRules.ts                     # Ngưỡng mặc định khi node mới xuất hiện (cm nước trên mặt đường). Admin sửa riêng từng...
    │   └── resolveAdminKey.ts                # Lấy khóa admin; máy chủ thật bắt buộc khóa ≥ 16 ký tự
    ├── db/
    │   ├── Database.ts                       # "Ổ CẮM" CƠ SỞ DỮ LIỆU — backend chỉ dùng 3 hàm này, nên chạy được với 2 loại DB:
    │   ├── connectPostgres.ts                # Kết nối tới PostgreSQL thật bằng chuỗi DATABASE_URL (dùng trên máy chủ).
    │   ├── createDatabase.ts                 # Chọn loại DB: có DATABASE_URL → PostgreSQL thật; để trống → PostgreSQL nhúng để chạy...
    │   ├── openEmbeddedDatabase.ts           # Mở PostgreSQL NHÚNG (PGlite) — chạy ngay trong backend, KHÔNG cần cài PostgreSQL.
    │   ├── runMigrations.ts                  # Tạo/cập nhật bảng khi khởi động (chạy các file sql/ chưa chạy)
    │   └── sharedDatabase.ts                 # Giữ 1 kết nối DB dùng chung cho cả backend: db().query(...)
    ├── domain/
    │   ├── compareFloodLevels.ts             # Trả về mức nặng hơn trong 2 mức. Ví dụ worseFloodLevel('warning', 'critical') = 'crit...
    │   ├── getConnectionState.ts             # TÍNH TRẠNG THÁI KẾT NỐI từ lần cuối có dữ liệu và chu kỳ gửi của node.
    │   ├── getFloodLevel.ts                  # XẾP MỨC NGẬP từ độ sâu (cm) và 3 ngưỡng của node.
    │   ├── getInfluenceRadius.ts             # Bán kính vùng ảnh hưởng (m) theo mức ngập; dữ liệu đã cũ thì luôn 0 (không vẽ).
    │   ├── isFloodInfoUsable.ts              # Dữ liệu ngập của node còn đủ mới để VẼ VÙNG NGẬP và dùng khi KIỂM TRA TUYẾN không?
    │   └── isFloodingLevel.ts                # Mức này có tính là "đang ngập" không (từ Cảnh báo trở lên).
    ├── geo/
    │   ├── clipPathToCircle.ts               # Cắt 1 con đường theo hình tròn (giữ phần nằm trong vùng ngập)
    │   ├── distanceInMeters.ts               # Khoảng cách theo đường chim bay giữa 2 điểm (mét), công thức haversine.
    │   ├── distanceToPathInMeters.ts         # Khoảng cách ngắn nhất (mét) từ 1 điểm tới 1 đường gấp khúc (vd tuyến đường đi).
    │   ├── toIsoString.ts                    # Đổi thời gian từ DB (Date hoặc chuỗi) sang chuỗi ISO chuẩn "2026-10-25T07:00:00.000Z"...
    │   └── toLocalMeters.ts                  # Đổi tọa độ sang (x, y) tính bằng MÉT so với 1 điểm gốc — coi mặt đất là phẳng.
    ├── http/
    │   ├── HttpError.ts                      # Lỗi trả về cho app kèm mã HTTP, vd `throw new HttpError(404, 'Không có node này')`.
    │   ├── createHttpApp.ts                  # Tạo ứng dụng web: CORS, JSON, gắn các API + trang /admin
    │   ├── handleHttpError.ts                # XỬ LÝ LỖI CHUNG cho mọi API: luôn trả JSON dạng { "error": "câu tiếng Việt" }.
    │   ├── limitRequestsPerMinute.ts         # GIỚI HẠN SỐ LẦN GỌI mỗi phút cho mỗi địa chỉ IP — dùng cho API gọi ra dịch vụ ngoài (...
    │   ├── readQueryNumber.ts                # Đọc 1 tham số số trên URL (?lat=10.77). Thiếu thì dùng mặc định; ghi sai hoặc ngoài k...
    │   └── requireAdminKey.ts                # CHẶN API ADMIN nếu không có đúng khóa. Gửi khóa trong header:  x-admin-key: <ADMIN_AP...
    ├── ingest/
    │   ├── IngestRejection.ts                # Lỗi "tin nhắn không hợp lệ" kèm lý do tiếng Việt
    │   ├── IngestResult.ts                   # Kết quả xử lý 1 tin nhắn của node.
    │   ├── ParsedNodeMessage.ts              # 1 tin nhắn của node SAU KHI đã kiểm tra hợp lệ và chuẩn hóa — sẵn sàng lưu vào DB.
    │   ├── describeSchemaIssues.ts           # Đổi lỗi kiểm tra dữ liệu của thư viện zod thành câu tiếng Việt dễ hiểu.
    │   ├── handleNodeMessage.ts              # ★ XỬ LÝ 1 TIN NHẮN NODE: kiểm tra → lưu → đẩy realtime
    │   ├── nodeMessageSchema.ts              # ★ Khuôn dữ liệu 1 tin nhắn node (trường nào, kiểu gì, khoảng nào)
    │   ├── parseClockTime.ts                 # Đọc giờ không có ngày node gửi: "14:05:30", "14/05/30"
    │   ├── parseDateText.ts                  # Đọc ngày node gửi kèm: "2026-10-26" hoặc "26/10/2026"
    │   ├── parseNodeMessage.ts               # ★ Kiểm tra + đổi đơn vị 1 tin nhắn (mm→cm, m→cm, mm/s→mm/h), sai thì nêu lý do
    │   ├── parseTimeValue.ts                 # Đọc thời gian dạng ISO 8601 hoặc số Unix (kiểu cũ)
    │   ├── resolveMeasuredAt.ts              # Chọn thời điểm đo: giờ node (ghép ngày hôm nay nếu chỉ có giờ) hay giờ máy chủ
    │   └── vietnamTime.ts                    # Ghép ngày + giờ theo giờ Việt Nam (UTC+7)
    ├── mappers/
    │   ├── toModelDto.ts                     # Đổi 1 dòng bảng node_models sang dạng gửi cho app.
    │   ├── toReadingDto.ts                   # Đổi 1 dòng bảng readings sang dạng gửi cho app
    │   └── toStationDto.ts                   # Ghép node + lần đo mới nhất + công thức → 1 "trạm" gửi cho app
    ├── mqtt/
    │   ├── getNodeIdFromTopic.ts             # Lấy mã node từ topic MQTT. Quy ước topic: smartflood/nodes/<mã node>/data
    │   ├── mqttStatus.ts                     # Tình trạng kết nối MQTT hiện tại — API /api/v1/health đọc từ đây.
    │   ├── startEmbeddedBroker.ts            # BẬT 1 BROKER MQTT NHÚNG (thư viện aedes) — chỉ dùng khi chạy thử trên laptop, để khôn...
    │   └── subscribeNodeMessages.ts          # KẾT NỐI MQTT VÀ NGHE DỮ LIỆU NODE: gateway LoRa đẩy mỗi lần đo lên topic smartflood/n...
    ├── nearby/
    │   └── buildNearbyResult.ts              # TÌNH HÌNH NGẬP QUANH 1 VỊ TRÍ (màn "Quanh bạn" của app):
    ├── realtime/
    │   ├── createRealtimeServer.ts           # Bật Socket.IO trên cùng cổng với API (http://máy-chủ:3000/socket.io/).
    │   └── realtimeHub.ts                    # Đẩy trạm vừa cập nhật tới mọi app đang mở (station:update)
    ├── repositories/
    │   ├── errors/
    │   │   ├── insertIngestError.ts          # Ghi lại 1 tin nhắn bị từ chối kèm lý do — admin xem ở trang /admin, mục "Tin nhắn lỗi".
    │   │   └── listIngestErrors.ts           # Các tin nhắn bị từ chối gần nhất (mới nhất trước).
    │   ├── models/
    │   │   ├── insertNodeModel.ts            # LƯU 1 PHIÊN BẢN CÔNG THỨC node vừa gửi. Node gửi lại phiên bản đã có thì bỏ qua (giữ...
    │   │   └── listNodeModels.ts             # Tất cả phiên bản công thức của 1 node, từ cũ (v1 = công thức chung) đến mới.
    │   ├── nodes/
    │   │   ├── NodeSettings.ts               # Các thông tin admin được đặt cho 1 node (trang /admin → Sửa node). Trường nào không g...
    │   │   ├── createNode.ts                 # Admin tạo node mới trước khi node gửi dữ liệu. Mã node đã có thì báo lỗi (trả về false).
    │   │   ├── ensureNodeExists.ts           # Node lạ gửi dữ liệu lần đầu → tự tạo node mới (tên tạm = mã node, chưa có vị trí).
    │   │   ├── findNodeRecord.ts             # Lấy 1 node theo mã; không có thì trả về null.
    │   │   ├── listStationRows.ts            # Lấy các node kèm lần đo mới nhất + công thức mới nhất (1 câu SQL)
    │   │   ├── setNodeLocationIfMissing.ts   # Node gửi kèm tọa độ mà node CHƯA có vị trí thì lưu vào. Đã có vị trí (admin đặt) thì...
    │   │   ├── touchNodeLastMessage.ts       # Ghi lại "lần cuối máy chủ nhận tin nhắn trực tiếp của node" — dùng để tính online / m...
    │   │   └── updateNode.ts                 # Admin sửa thông tin node (chỉ sửa những trường có gửi lên). Trả về false nếu không có...
    │   └── readings/
    │       ├── insertReading.ts              # LƯU 1 LẦN ĐO. Trả về true nếu lưu mới, false nếu đã có lần đo cùng node + cùng thời điểm
    │       └── listReadings.ts               # LỊCH SỬ ĐO của 1 node trong khoảng [from, to], tối đa `limit` lần đo MỚI NHẤT,
    ├── roads/
    │   ├── fetchRoadsAround.ts               # Lấy hình dạng các con đường quanh 1 điểm từ OpenStreetMap (Overpass)
    │   └── getFloodedRoadsForStation.ts      # Các đoạn đường bị ngập quanh 1 node (có nhớ tạm 12 giờ)
    ├── routes/
    │   ├── admin/
    │   │   ├── getAdminNodes.ts              # GET /api/v1/admin/nodes — mọi node, kể cả node đã ẩn, kèm tình trạng MQTT (trang admin).
    │   │   ├── getIngestErrors.ts            # GET /api/v1/admin/ingest-errors?limit=100 — các tin nhắn bị từ chối gần nhất và lý do.
    │   │   ├── nodeSettingsSchema.ts         # Khuôn thông tin admin được sửa cho 1 node (mọi trường đều không bắt buộc).
    │   │   ├── patchAdminNode.ts             # PATCH /api/v1/admin/nodes/:nodeId — sửa tên, vị trí, ngưỡng, chu kỳ gửi, ẩn/hiện node.
    │   │   ├── postAdminNode.ts              # POST /api/v1/admin/nodes — tạo node mới (khai báo trước tên, vị trí, ngưỡng).
    │   │   ├── postImportReadings.ts         # POST /api/v1/admin/import  body: { "messages": [ {...}, {...} ] }  (tối đa 5000 tin m...
    │   │   └── postTestMessage.ts            # POST /api/v1/admin/messages  body: { "message": { ...1 tin nhắn giống node gửi... } }
    │   ├── public/
    │   │   ├── getHealth.ts                  # GET /api/v1/health — máy chủ còn sống không, DB và MQTT có kết nối không. Dùng để kiể...
    │   │   ├── getNearby.ts                  # GET /api/v1/nearby?lat=10.77&lng=106.66&radius=2000 — tình hình ngập quanh 1 vị trí (...
    │   │   ├── getStation.ts                 # GET /api/v1/stations/:nodeId — 1 trạm.
    │   │   ├── getStationModels.ts           # GET /api/v1/stations/:nodeId/models — các phiên bản công thức của node (v1 = công thứ...
    │   │   ├── getStationReadings.ts         # GET /api/v1/stations/:nodeId/readings?hours=24&limit=1000 — lịch sử đo để vẽ biểu đồ.
    │   │   ├── getStations.ts                # GET /api/v1/stations — danh sách trạm đang hoạt động kèm tình trạng mới nhất (app tải...
    │   │   └── postRouteCheck.ts             # POST /api/v1/route/check  body: { "start": {latitude, longitude}, "end": {latitude, l...
    │   ├── registerAdminRoutes.ts            # CÁC API ADMIN — phải gửi header x-admin-key đúng ADMIN_API_KEY. Trang /admin gọi các...
    │   └── registerPublicRoutes.ts           # CÁC API CÔNG KHAI cho app — chỉ đọc, không cần đăng nhập.
    ├── routing/
    │   ├── FloodZone.ts                      # 1 vùng cần tránh khi đi đường: tâm là node đang ngập, bán kính = vùng ảnh hưởng + vùn...
    │   ├── checkRoute.ts                     # KIỂM TRA TUYẾN ĐƯỜNG A → B có đi qua vùng ngập không, và tìm tuyến tránh nếu có. Cách...
    │   ├── fetchOsrmRoutes.ts                # HỎI DỊCH VỤ CHỈ ĐƯỜNG OSRM: đi qua lần lượt các điểm `points` (điểm đi, [điểm trung g...
    │   ├── findActiveFloodZones.ts           # Các vùng ngập ĐANG CÓ HIỆU LỰC: node có vị trí, dữ liệu còn mới, từ mức Cảnh báo trở...
    │   ├── findFloodZonesOnPath.ts           # Những vùng ngập mà tuyến đường `path` đi xuyên qua (khoảng cách từ node tới tuyến < b...
    │   ├── formatRouteLabels.ts              # "850 m" hoặc "3,2 km".
    │   └── makeDetourWaypoints.ts            # TẠO 2 ĐIỂM ĐI VÒNG quanh 1 vùng ngập: lệch sang 2 bên của hướng đi (vuông góc với đườ...
    ├── services/
    │   └── loadStations.ts                   # LẤY DANH SÁCH TRẠM đã tính sẵn tình trạng (dùng cho app, trang admin, kiểm tra tuyến,...
    ├── types/
    │   ├── ConnectionState.ts                # TRẠNG THÁI KẾT NỐI của node (xem quy tắc ở src/config/floodRules.ts):
    │   ├── FloodLevel.ts                     # MỨC NGẬP — so độ sâu ngập với 3 ngưỡng của node:
    │   ├── FloodedRoad.ts                    # 1 đoạn đường nằm trong vùng ảnh hưởng của 1 node đang ngập — app tô màu theo `level`.
    │   ├── LatLng.ts                         # Một điểm trên bản đồ: vĩ độ, kinh độ (cùng dạng app dùng).
    │   ├── NearbyResult.ts                   # KẾT QUẢ "QUANH BẠN" (GET /api/v1/nearby):
    │   ├── NodeModelRecord.ts                # 1 dòng của bảng `node_models`: 1 phiên bản công thức hồi quy của 1 node.
    │   ├── NodeRecord.ts                     # 1 dòng của bảng `nodes` đúng như trong cơ sở dữ liệu (tên cột viết kiểu snake_case).
    │   ├── ReadingRecord.ts                  # 1 dòng của bảng `readings` (1 lần đo). Thời gian có thể là Date hoặc chuỗi tùy cách t...
    │   ├── RouteCheckResult.ts               # Dạng kết quả kiểm tra tuyến đường gửi cho app
    │   └── StationDto.ts                     # Dạng dữ liệu 1 trạm / 1 lần đo / 1 công thức gửi cho app
    └── server.ts                             # ★ ĐIỂM KHỞI ĐỘNG: nối DB → bật API → nối MQTT
```

Đọc code theo thứ tự này là dễ hiểu nhất:

1. `src/server.ts`: khởi động gồm những bước gì
2. `sql/001_create_tables.sql` + `sql/002_iot_packet_v2.sql`: dữ liệu lưu thế nào
3. `src/ingest/handleNodeMessage.ts` → `parseNodeMessage.ts`: 1 tin nhắn node đi qua những bước nào, đổi đơn vị ra sao
4. `src/services/loadStations.ts` → `src/mappers/toStationDto.ts`: tính tình trạng trạm
5. `src/routes/registerPublicRoutes.ts`: app gọi được những API nào

---

## 8. Muốn sửa X thì sửa ở đâu

| Muốn | Sửa file |
|---|---|
| Đổi ngưỡng ngập mặc định, bán kính vùng ảnh hưởng, quy tắc online/offline | `src/config/floodRules.ts` |
| Đổi ngưỡng / vị trí **1 node cụ thể** | Trang admin → Xem / Sửa (không cần sửa code) |
| Node gửi thêm trường mới và muốn có cột riêng | **file mới** `sql/003_...sql` (thêm cột, không sửa file cũ) + `src/ingest/parseNodeMessage.ts` + `src/ingest/nodeMessageSchema.ts` + `src/repositories/readings/insertReading.ts` + `src/types/ReadingRecord.ts` + `src/mappers/toReadingDto.ts` |
| Đổi khoảng giá trị hợp lệ của 1 trường | `src/ingest/nodeMessageSchema.ts` |
| Bên IoT đổi tên trường / đơn vị gửi lên | `src/ingest/nodeMessageSchema.ts` (tên, khoảng) + `src/ingest/parseNodeMessage.ts` (đổi đơn vị) + [IOT_DATA_FORMAT.md](IOT_DATA_FORMAT.md) |
| Đổi cách xử lý giờ node gửi (vd gateway có ngày) | `src/ingest/resolveMeasuredAt.ts` + `DEVICE_CLOCK_*` trong `src/config/floodRules.ts` |
| Thêm 1 API mới | Tạo file trong `src/routes/public/` rồi khai báo trong `src/routes/registerPublicRoutes.ts` |
| Đổi loại đường được tô màu | `src/roads/fetchRoadsAround.ts` (biến `ROAD_TYPES`) |
| Đổi câu thông báo kiểm tra tuyến | `src/routing/checkRoute.ts` |
| Giao diện trang admin | `public/admin/admin.js`, `admin.css` |

Kiểm tra lỗi kiểu trước khi gửi code: `npm run typecheck` (không in gì = không lỗi).

---

## 9. Lỗi thường gặp

| Hiện tượng | Nguyên nhân / cách sửa |
|---|---|
| `EADDRINUSE ... 3000` | Cổng 3000 đang bị chương trình khác dùng (backend cũ chưa tắt?). Tắt nó đi, hoặc thêm `PORT=3001` vào file `.env` |
| `EADDRINUSE ... 1883` | Máy đã có Mosquitto chạy sẵn. Thêm `EMBEDDED_MQTT_PORT=1884` vào `.env`, và chạy `npm run fake-node -- --url mqtt://127.0.0.1:1884` |
| Bật lại backend báo lỗi đọc `data/pglite` | Lần trước tắt đột ngột làm hỏng DB thử. Tắt backend, xóa thư mục `data/`, bật lại |
| `npm run fake-node` báo `ECONNREFUSED` | Backend chưa chạy. Chạy `npm run dev` trước, ở cửa sổ khác |
| Trang admin báo "Khóa admin không đúng" | Chạy thử: khóa là `dev-admin-key`. Máy chủ: giá trị `ADMIN_API_KEY` trong `.env` |
| Node gửi mà không thấy trong admin | Xem tab **Tin nhắn lỗi**. Không có gì ở đó thì gateway chưa tới được máy chủ: kiểm tra địa chỉ, cổng 1883, tài khoản/mật khẩu MQTT, topic |
| Node hiện "Mất kết nối" dù vẫn gửi | Chu kỳ gửi thật dài hơn chu kỳ khai báo. Sửa **Chu kỳ gửi (giây)** của node trong admin |
| "Quanh bạn" không tô màu đường mà vẽ vòng tròn | Máy chủ không gọi được Overpass (mạng chặn / dịch vụ quá tải). Log có dòng `[roads] Không lấy được đường...`; 2 phút sau tự thử lại |
| Kiểm tra tuyến ra đường thẳng | OSRM công cộng lỗi/quá tải. Kết quả ghi rõ "đang ước lượng bằng đường thẳng" |
| Máy chủ báo `phải đặt ADMIN_API_KEY dài ít nhất 16 ký tự` | Đặt khóa dài hơn trong `.env` |
| `docker compose up` báo `Chưa đặt POSTGRES_PASSWORD trong .env` | Chưa tạo file `.env` từ `.env.production.example` |

---

## 10. Giới hạn hiện tại (nói thẳng để khỏi bất ngờ)

- **"Đường ngập" là ước lượng.** Node chỉ đo được 1 điểm; các con đường trong bán kính 100–300 m quanh node được coi là ngập theo mức của node đó.
- **Chưa có thông báo đẩy (push)** khi app đang tắt. App chỉ báo khi đang mở.
- **Chưa có điều khiển còi/bơm**, vì cần đường gửi lệnh ngược xuống node qua LoRa; bên IoT chưa có.
- **MQTT chưa mã hóa TLS.** Nên giới hạn IP được vào cổng 1883 (mục 3).
- **OSRM và Overpass là dịch vụ miễn phí dùng chung**, có thể chậm hoặc từ chối khi quá tải; backend đã có giới hạn số lần gọi và phương án dự phòng. Dùng thật lâu dài thì nên tự dựng OSRM.
- **Chưa có dự đoán.** Trạm A01, A02 hiện chỉ gửi số đo, chưa gửi dự đoán/công thức → app ghi "Trạm chưa có dự đoán". Backend **không tự học công thức** (cách A: node tự học rồi gửi lên; backend có sẵn chỗ lưu). Cách máy chủ tự học (cách B) đang để sau.
- **Một số câu hỏi về dữ liệu chưa có câu trả lời** (mực nước đo so với mốc nào, lượng mưa cộng dồn từ lúc nào, gateway có ngày tháng không...): xem mục 8 của [IOT_DATA_FORMAT.md](IOT_DATA_FORMAT.md).
- **Dữ liệu từ `npm run fake-node` là dữ liệu giả**: mã node `TEST-...`, có `"is_test": true`, trang admin gắn nhãn **THỬ**. **Không** chạy lệnh này vào máy chủ thật.
- Đã kiểm tra: `npm run typecheck`, chạy thật với PGlite và với PostgreSQL 16, MQTT, toàn bộ API, trang admin, nhập file JSON/CSV. **Chưa** chạy thử bằng `docker compose` (máy dùng để viết code không tải được image Docker), nên lần deploy đầu cần để ý log.
