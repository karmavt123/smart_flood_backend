# SmartFlood Backend

Máy chủ của hệ thống **SMARTFLOOD – IoT giám sát, cảnh báo sớm và hỗ trợ định tuyến tránh ngập đô thị**.

Viết mới hoàn toàn, **tách riêng khỏi backend của web smartflood.vn cũ**. Backend làm 4 việc:

1. **Nhận dữ liệu trạm** qua MQTT (mỗi trạm ESP32 tự gửi qua Wi-Fi, 5 phút 1 lần) rồi lưu vào PostgreSQL.
2. **Học lại công thức dự báo** cho từng trạm mỗi ngày, rồi **gửi hệ số mới xuống trạm** qua MQTT.
3. **Cung cấp API cho app** (không cần đăng nhập): danh sách trạm, lịch sử, công thức từng trạm, tình hình ngập quanh vị trí người dùng, kiểm tra tuyến đường, cập nhật realtime.
4. **Trang admin** `/admin` để xem và quản lý trạm, bấm **"Học lại ngay"**.

> **Bên IoT:** định dạng dữ liệu trạm phải gửi và cách nhận hệ số nằm ở **[IOT_DATA_FORMAT.md](IOT_DATA_FORMAT.md)** (bản 3.1, 29/10/2026: V = tốc độ thoát nước `drain_mm_5min`, bắt buộc; trạm gửi thẳng qua Wi-Fi).
> **Anh mentor deploy:** đọc **mục 3**.

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Chạy thử trên laptop](#2-chạy-thử-trên-laptop-không-cần-cài-database-hay-mqtt)
   - [2b. Trạm dùng nền tảng E-Ra](#2b-trạm-dùng-nền-tảng-e-ra-eoh)
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
 ┌──────────────┐  Wi-Fi + MQTT (1883)   ┌────────────┐      ┌──────────────────────────────────┐
 │ Trạm ESP32   │ ── số đo, 5 phút ────▶ │ Mosquitto  │ ───▶ │ Backend (Node.js, cổng 3000)     │
 │ tự đo, tự    │   .../data             │            │      │  1. kiểm tra JSON, đổi đơn vị    │
 │ dự báo 5     │                        │            │      │  2. lưu PostgreSQL               │
 │ phút tới     │ ◀── hệ số mới ──────── │            │ ◀─── │  3. đẩy realtime (Socket.IO)     │
 │ bằng hệ số   │   .../model (retained) └────────────┘      │  4. 00:30 mỗi ngày: học lại hệ số│
 │ máy chủ gửi  │                                            └──────┬──────────────┬────────────┘
 └──────────────┘                                                   │ API /api/v1  │ /admin
                                                                    ▼              ▼
                                                              App SmartFlood   Trang admin
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

**Công thức dự báo (chốt 29/10/2026):** $\hat H(t+5) = a_0 + a_1 H + a_2 V + a_3 R + a_4 S$ (độ ngập mm, tốc độ thoát nước mm/5 phút, lượng mưa trong 5 phút mm, thủy triều m — bỏ nhiệt độ, độ ẩm, ánh sáng của báo cáo cũ). **Trạm tự dự báo** bằng hệ số đang có; **máy chủ học lại hệ số** mỗi ngày từ dữ liệu lúc đường ngập của chính trạm đó, chỉ nhận khi sai số giảm, rồi gửi xuống trạm. Mọi phiên bản được giữ lại (bảng `node_models`) nên xem được công thức mỗi trạm thay đổi ra sao. Chi tiết: mục 6 và [IOT_DATA_FORMAT.md](IOT_DATA_FORMAT.md) mục 5.

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
[db] Đã chạy 003_server_retraining.sql
[db] Đang dùng PostgreSQL nhúng (./data/pglite)
[http] API:   http://localhost:3000/api/v1/stations
[http] Admin: http://localhost:3000/admin
[mqtt] Broker nhúng đang chạy ở mqtt://127.0.0.1:1883 (chỉ để chạy thử)
[train] Tự học lại công thức mỗi ngày lúc 00:30 (giờ VN), lần tới sau ... giờ ... phút
[mqtt] Đã kết nối mqtt://127.0.0.1:1883, nghe topic "smartflood/nodes/+/data"
```

(Đã chạy bản cũ thì chỉ thấy dòng `003_...`: backend tự thêm cột/bảng mới, **dữ liệu cũ giữ nguyên**.)

**Để nguyên cửa sổ này.** Sửa code thì backend tự khởi động lại. Tắt bằng `Ctrl + C`.

### Bước 4: Giả lập node gửi dữ liệu

Mở **terminal thứ 2** (cũng ở thư mục backend):

```bash
npm run fake-node
```

Lệnh này tạo 2 trạm thử `TEST-A01` (chỗ trũng, dễ ngập) và `TEST-A02` quanh ĐH Bách Khoa, cứ 5 giây gửi 1 lần (trạm thật 5 **phút** 1 lần), **đúng gói tin bản 3.1** (`water_level_mm`, `drain_mm_5min`, `rain_mm`, `tide_m`, ngày + giờ VN; có công thức thì thêm `predicted_water_level_mm`). Mưa giả lặp lại mỗi 10 phút: **5 phút mưa** (nước dâng) rồi **5 phút tạnh** (nước rút). Đợi khoảng 2–3 phút mới thấy ngập. Để chạy lâu cũng được, trên app sẽ thấy trạm đổi mức ngập qua lại.

Trạm thử cũng **nghe hệ số máy chủ gửi xuống** giống trạm thật: lúc đầu chưa có công thức nên chưa dự báo; máy chủ học xong (Bước 7) thì nó in `TEST-A01 nhận công thức mới v1 từ máy chủ → dùng ngay` và bắt đầu gửi độ ngập dự báo.

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

### Bước 7 (tùy chọn): Demo máy chủ học lại công thức, gửi xuống trạm

1. Để node giả (Bước 4) chạy **khoảng 15 phút**: máy chủ cần ít nhất 30 cặp mẫu lúc đang ngập, mỗi cặp là *(lúc t → 5 phút sau)*.
2. Mở trang admin → **Xem / Sửa** ở dòng `TEST-A01` → mục **Công thức dự đoán** → bấm **Học lại ngay**.
3. Ô kết quả báo ví dụ `✓ Có công thức mới: Học từ 120 cặp mẫu lúc đang ngập → v1. Sai số 0,85 cm (...). Đã gửi về trạm.` Chưa đủ mẫu thì báo `Giữ công thức cũ: Chỉ có 12 cặp mẫu...` — đợi thêm rồi bấm lại.
4. Cửa sổ node giả in `TEST-A01 nhận công thức mới v1 từ máy chủ → dùng ngay`. Vài giây sau, bảng công thức trong admin có thêm cột **Trạm bắt đầu dùng**, và app (màn chi tiết trạm) hiện thẻ **Dự đoán 5 phút tới** + thẻ **Công thức dự đoán riêng của trạm**.
5. Bấm **Học lại ngay** lần nữa: công thức mới chỉ được nhận nếu **sai số nhỏ hơn** bản đang dùng, không thì **Nhật ký học lại** ghi rõ "không tốt hơn v1 → giữ v1".

Không bấm thì máy chủ cũng **tự học mỗi ngày lúc 00:30** (đổi giờ bằng `MODEL_RETRAIN_TIME` trong `.env`).

### Xóa dữ liệu thử

Tắt backend (`Ctrl + C`), xóa thư mục `data/` trong thư mục backend, rồi bật lại:

```powershell
# Windows PowerShell, trong thư mục backend
Remove-Item -Recurse -Force .\data
npm run dev
```

macOS / Linux: `rm -rf data && npm run dev`. Trong `data/` chỉ có dữ liệu chạy thử trên laptop, máy chủ thật không bị ảnh hưởng.

---

## 2b. Trạm dùng nền tảng E-Ra (EoH)

Trạm gửi dữ liệu lên **E-Ra** (thư viện `ERa` hoặc "3rd MQTT Gateway") thay vì gửi thẳng lên máy chủ mình → máy chủ **tự kết nối vào broker E-Ra** (`mqtt1.eoh.io:1883`), nghe các tin của 1 gateway, gom lại thành 1 lần đo rồi lưu như trạm bình thường (app, admin, học công thức đều dùng được). Code: `src/era/`.

**Cần 3 thứ** (điền vào `.env`, xem mẫu trong `.env.example`):

| Biến | Lấy ở đâu |
|---|---|
| `ERA_GATEWAY_TOKEN` | `app.e-ra.io` → **All Gateways** → chọn gateway → mã token (mã ESP32 dùng để đăng nhập E-Ra). **Bí mật**, chỉ để trong `.env` |
| `ERA_NODE_ID` | Mã trạm muốn hiện bên SmartFlood, vd `A01` |
| `ERA_FIELD_MAP` | Trường nào bên E-Ra là ngập / mưa / triều — xem bước dò bên dưới |

**Bước dò trường dữ liệu** (làm 1 lần): PowerShell trong thư mục backend, thay 3 chỗ `TOKEN`:

```powershell
npx mqtt sub -h mqtt1.eoh.io -p 1883 -u TOKEN -P TOKEN -i smartflood-thu-nghe -t "eoh/chip/TOKEN/#" -v
```

Đợi trạm gửi, mỗi dòng là 1 tin:

| Thấy dòng dạng | Trường E-Ra là | Ghi vào `ERA_FIELD_MAP` |
|---|---|---|
| `eoh/chip/TOKEN/third_party/<uid>/data {"muc_nuoc":12,"mua":3}` | key trong JSON | `muc_nuoc=water_level_mm*10,mua=rain_mm` |
| `eoh/chip/TOKEN/config/12345/value {"v":12}` | số config | `config:12345=water_level_mm*10` |

`*10` khi E-Ra gửi độ ngập theo **cm** (máy chủ cần **mm**); gửi mm sẵn thì bỏ `*10`. Thủy triều phải ra **m** (E-Ra gửi cm thì `*0.01`).

**Cảm biến siêu âm gửi KHOẢNG CÁCH (vd `"khoang cach": 26.3` cm) chứ không phải độ ngập:** đo khoảng cách $H_0$ từ cảm biến xuống **mặt đường khô** (cm), rồi

$$\text{độ ngập (mm)} = (H_0 - \text{khoảng cách}) \times 10 = \text{khoảng cách} \times (-10) + 10H_0$$

→ ghi `khoang cach=water_level_mm*-10+800` (với $H_0 = 80$ cm). Tên trường có dấu cách vẫn được. Dạng chung: `nguon=dich*a+b` nghĩa là giá trị lưu $= a \times \text{giá trị E-Ra} + b$.

**Bật:** điền 3 biến vào `.env` → `npm run dev`. Log đúng:

```
[era] Đã kết nối mqtt://mqtt1.eoh.io:1883, nghe gateway …a1b2 → trạm A01
[era] Đã lưu số đo của A01: ngập 120 mm, dâng 2.4 mm/phút, mưa 3 mm, triều 1.2 m
```

Kiểm tra thêm ở `/api/v1/health` (mục `era`: đã kết nối chưa, nhận bao nhiêu tin, lưu bao nhiêu lần đo).

**Cách cầu nối làm việc:**
- Client ID ngẫu nhiên, khác thiết bị → **không đá trạm rớt mạng**; chạy cùng lúc trên laptop và máy chủ cũng được.
- E-Ra chưa có trường V nên cầu nối **không bắt buộc** `drain_mm_5min` (muốn có thì khai báo `ten_truong_era=drain_mm_5min` trong `ERA_FIELD_MAP`). Vẫn tự tính tốc độ dâng (kiểu cũ) để xem trên admin; số đo thiếu V không được dùng để học công thức.
- Trạm E-Ra hay gửi vài giây 1 lần → chỉ lưu **1 lần đo mỗi `ERA_SAVE_INTERVAL_SEC` giây** (mặc định 60).
- Bỏ qua giá trị cũ broker còn giữ lại lúc vừa kết nối (tin *retained*) → không lưu trùng.
- Log luôn che token thành `***`. Trường lạ chưa khai báo thì log 1 lần `Thấy trường "temp" ... → bỏ qua`.

| Log | Nghĩa là |
|---|---|
| `Lỗi kết nối E-Ra: Connection refused: Not authorized (sai token gateway?)` | Sai `ERA_GATEWAY_TOKEN` |
| `E-Ra TỪ CHỐI cho đọc dữ liệu của gateway này` | Token đúng nhưng E-Ra không cho đọc → báo lại, phải đổi cách |
| `ERA_FIELD_MAP chưa có rain_mm, tide_m ...` | Máy chủ đang bắt buộc ngập + mưa + triều → thiếu trường thì mọi lần đo bị từ chối |
| `Từ chối số đo của A01: ...` | Số đo sai khoảng hợp lệ (vd quên `*10`), xem lý do ngay trong log |

**Chưa làm:** gửi hệ số công thức máy chủ học được **xuống** trạm E-Ra (trạm E-Ra không nghe topic `smartflood/nodes/<id>/model`). Máy chủ vẫn học và lưu công thức, chỉ là trạm chưa nhận được.

---

## 3. Đưa lên máy chủ (Docker)

### Cần có

- Máy chủ Linux đã cài **Docker** và **Docker Compose v2** (lệnh `docker compose version` chạy được).
- Mở cổng **3000** (API + admin; hoặc 443 nếu đặt sau Caddy/Nginx) và **1883** (MQTT cho các trạm).
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

### Cấu hình trạm (đưa bên IoT)

Đưa bên IoT: địa chỉ máy chủ, cổng `1883`, tài khoản `smartflood-gateway` (tên cũ từ hồi còn gateway LoRa, giờ là tài khoản chung của các trạm), mật khẩu `MQTT_GATEWAY_PASSWORD`, topic gửi `smartflood/nodes/<id>/data`, topic nhận hệ số `smartflood/nodes/<id>/model`. Chi tiết ở [IOT_DATA_FORMAT.md](IOT_DATA_FORMAT.md).

> **Đã deploy bản cũ?** File `mosquitto/acl` có thêm quyền cho topic `.../model`. Sau khi chép code mới, chạy `docker compose restart mosquitto` để Mosquitto đọc lại quyền.

### Nên làm thêm (khuyên mạnh)

- **HTTPS bằng Caddy.** Có tên miền (vd `api.smartflood.vn`) trỏ về máy chủ thì thêm vào Caddyfile:

  ```
  api.smartflood.vn {
      reverse_proxy localhost:3000
  }
  ```

  Sau đó đặt `TRUST_PROXY=true` trong `.env`, chạy `docker compose up -d`, và đóng cổng 3000 ra ngoài.
- **MQTT hiện chưa mã hóa (TLS)**: mật khẩu MQTT đi trên đường truyền dạng chữ thường. Trạm dùng Wi-Fi nên IP thay đổi, không chặn theo IP được như hồi có gateway — nên bật TLS (cổng 8883) khi có tên miền, và đặt mật khẩu MQTT dài.
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
| GET | `/stations/:nodeId/models` | Các phiên bản công thức của trạm (cũ → mới), kèm `source` (`server`/`node`), `publishedAt`, `appliedAt` |
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
  "latest": { "measuredAt": "...", "floodDepthCm": 12.5, "drainMm5min": 6.5, "riseRateMmMin": null, "rainMm": 2.5, "rainRateMmH": null, "rainMm1h": null,
              "tideCm": 135, "temperatureC": null, "humidityPct": null, "lightLux": null, "batteryPct": null, "rssiDbm": null,
              "predictedDepthCm": 13.1, "forecastMinutes": 5, "modelVersion": 2,
              "timeSource": "device", "source": "mqtt", "extra": { "device_time": "14:05:30", "device_date": "2026-10-29" } },
  "model": { "version": 2, "source": "server", "publishedAt": "...", "appliedAt": "...", "horizonMinutes": 5,
             "intercept": 1.2, "coefficients": { "H": 0.97, "V": -0.4, "R": 0.6, "S": 2.1 }, "maeCm": 0.34, "...": "..." }
}
```

Đây là trạm A01 gửi gói tin bản 3.1 `{"id":"A01","date":"2026-10-29","time":"14:05:30","water_level_mm":125,"predicted_water_level_mm":131,"drain_mm_5min":6.5,"rain_mm":2.5,"tide_m":1.35,"model_version":2}`. `drainMm5min` = V (mm/5 phút) giữ nguyên; `riseRateMmMin` chỉ có ở gói tin cũ 3.0. Máy chủ đã đổi đơn vị: `floodDepthCm` = mm ÷ 10, `tideCm` = m × 100 (app hiển thị lại theo m), `predictedDepthCm` = mm ÷ 10. `null` = trạm không gửi; `model: null` = trạm chưa có công thức.

### Admin (header `x-admin-key: <ADMIN_API_KEY>`)

| Phương thức | Đường dẫn | Dùng để |
|---|---|---|
| GET | `/admin/nodes` | Mọi node (kể cả node đang ẩn) + tình trạng MQTT |
| POST | `/admin/nodes` | Tạo node `{nodeId, name?, latitude?, longitude?, warningCm?, ...}` |
| PATCH | `/admin/nodes/:nodeId` | Sửa tên, vị trí, ngưỡng, chu kỳ gửi, ẩn/hiện |
| POST | `/admin/nodes/:nodeId/retrain` | **Học lại ngay** công thức cho 1 trạm; trả về kết quả + phiên bản mới (nếu có) |
| GET | `/admin/nodes/:nodeId/training-runs?limit=20` | Nhật ký các lần học lại (kể cả lần giữ công thức cũ, kèm lý do) |
| GET | `/admin/ingest-errors?limit=100` | Tin nhắn bị từ chối + lý do |
| POST | `/admin/messages` body `{message: {...}}` | Gửi thử 1 tin nhắn (không cần MQTT) |
| POST | `/admin/import` body `{messages: [...]}` | Nhập dữ liệu cũ (tối đa 5000 tin/lần; script `npm run import` tự chia nhỏ) |

---

## 5. Cơ sở dữ liệu

File tạo bảng: [`sql/001_create_tables.sql`](sql/001_create_tables.sql), thêm cột cho gói tin bên IoT: [`sql/002_iot_packet_v2.sql`](sql/002_iot_packet_v2.sql), gói tin 3.0 + máy chủ học lại: [`sql/003_server_retraining.sql`](sql/003_server_retraining.sql), gói tin 3.1 (cột V thoát nước): [`sql/004_drain_rate.sql`](sql/004_drain_rate.sql). Xóa dữ liệu cũ (chạy tay 1 lần, không phải migration): [`scripts/sql/xoa_du_lieu_cu_v3_1.sql`](scripts/sql/xoa_du_lieu_cu_v3_1.sql). Mỗi cột đều có chú thích tiếng Việt trong file.

```
nodes (1 dòng = 1 thiết bị)               readings (1 dòng = 1 lần đo)
─────────────────────────────            ──────────────────────────────────────
id  (PK, vd "ND-Q1-01")  ◀───────┬────── node_id (FK)
name, address                     │       measured_at, received_at, time_source
latitude, longitude               │       flood_depth_cm, tide_cm                  ← bắt buộc
                                  │       drain_mm_5min (V thoát nước, mm/5 phút) ← bắt buộc từ bản 3.1
                                  │       rise_rate_mm_min (tốc độ dâng, gói tin 3.0 cũ)
                                  │       rain_mm, rain_rate_mm_h, rain_mm_1h      ← bắt buộc ít nhất 1
warning_cm, danger_cm, critical_cm│       temperature_c, humidity_pct, light_lux
expected_interval_sec             │       battery_pct, rssi_dbm
is_active, last_message_at        │       predicted_depth_cm, forecast_minutes, model_version
created_at, updated_at            │       source (mqtt/import/admin-test), extra (JSONB)
                                  │       UNIQUE (node_id, measured_at)  ← chống lưu trùng
                                  │
                                  │      node_models (1 dòng = 1 phiên bản công thức)
                                  │      ──────────────────────────────────────
                                  ├───── node_id (FK)    ┐ khóa chính
                                  │      version         ┘ (v1, v2, ... đánh số chung)
                                  │      source ('server' = máy chủ học / 'node' = trạm gửi)
                                  │      intercept, coefficients (JSONB: H, V, R, S)
                                  │      horizon_minutes, samples, mae_cm, rmse_cm, r2
                                  │      trained_at, first_seen_at, published_at, applied_at
                                  │
                                  │      model_training_runs (1 dòng = 1 lần học lại)
                                  │      ──────────────────────────────────────
                                  └───── node_id (FK), started_at, trigger (auto/manual)
                                         status (published/skipped/failed), reason
                                         pairs_total, samples_used, base_version, new_version
                                         mae_new_cm, mae_old_cm, mae_baseline_cm

ingest_errors: received_at, channel, topic, payload, reason   ← tin nhắn bị từ chối
schema_migrations: các file sql/ đã chạy
```

Chọn cách tổ chức này vì:

- **Tách `nodes` khỏi `readings`:** thông tin cố định (vị trí, ngưỡng) chỉ lưu 1 lần; mỗi lần đo chỉ thêm 1 dòng nhỏ.
- **Bảng `node_models` riêng, giữ mọi phiên bản:** đây là bằng chứng "mỗi trạm có công thức riêng". Xem được trạm nào đổi công thức lúc nào, sai số có giảm không, trạm đã nhận chưa.
- **Bảng `model_training_runs`:** ghi cả những lần học **không** ra công thức mới, kèm lý do, để biết vì sao trạm vẫn dùng công thức cũ.
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
| **Đổi đơn vị** gói tin bên IoT | `water_level_mm` ÷ 10 → cm · `tide_m` × 100 → cm · `predicted_water_level_mm` ÷ 10 → cm · `rain_rate_mm_s` × 3600 → mm/giờ · `drain_mm_5min`, `rain_mm`, `rise_rate_mm_min` giữ nguyên |
| **Học lại công thức** ([`src/config/modelRules.ts`](src/config/modelRules.ts), [`src/training/`](src/training/)) | Mỗi ngày 00:30 giờ VN (`MODEL_RETRAIN_TIME`), dữ liệu 30 ngày gần nhất (`MODEL_TRAINING_DAYS`). Ghép cặp *(lúc t → 5 phút sau, lệch tối đa ±90 s)*, **chỉ giữ cặp đang ngập** (bỏ cặp khô cả 2 lúc). Cần ≥ 30 cặp (`MODEL_MIN_SAMPLES`) và độ ngập 5 phút sau phải dao động ≥ 5 mm. Học trên 80% cũ, kiểm tra trên 20% mới nhất; hệ số kéo về gần hệ số đang dùng (`MODEL_PRIOR_WEIGHT` = 0,2; trạm chưa có công thức thì kéo về $\hat H = H$). **Chỉ dùng số đo có V** (`drain_mm_5min`, gói tin 3.1). **Chỉ nhận khi sai số nhỏ hơn** công thức đang dùng (chưa có thì phải tốt hơn cách đoán "nước giữ nguyên") |
| **Gửi hệ số xuống trạm** | Topic `smartflood/nodes/<id>/model`, QoS 1, **retained**. MQTT nối lại thì gửi lại bản mới nhất của máy chủ (phòng lỡ mất) |
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
├── IOT_DATA_FORMAT.md                        # ★ Đặc tả JSON trạm gửi lên + hệ số máy chủ gửi xuống — đưa cho bên IoT
├── README.md                                 # Bạn đang đọc file này
├── docker-compose.yml                        # ★ Chạy trên máy chủ: PostgreSQL + Mosquitto + backend
├── package-lock.json                         # Khóa đúng phiên bản thư viện (tự tạo, không sửa)
├── package.json                              # Danh sách thư viện + lệnh chạy (npm run dev...)
├── tsconfig.build.json                       # Cấu hình dịch TypeScript → dist/ để chạy trên máy chủ
├── tsconfig.json                             # Cấu hình TypeScript (kiểm tra lỗi kiểu)
├── examples/
│   ├── import-sample.csv                     # Ví dụ file CSV để nhập dữ liệu cũ
│   ├── import-sample.json                    # Ví dụ file JSON để nhập dữ liệu cũ
│   ├── model-message.example.json            # ★ Ví dụ tin hệ số máy chủ gửi xuống trạm (topic .../model)
│   ├── node-message.example.json             # ★ Ví dụ gói tin bản 3.1 của trạm A01 (đã có công thức)
│   ├── node-message.minimal.json             # Ví dụ tối thiểu: trạm mới lắp, chưa có công thức
│   ├── node-message.old-format.example.json  # Ví dụ tin nhắn kiểu cũ (bản 1.0) — vẫn nhận
│   └── node-message.v2.example.json          # Ví dụ gói tin bản 2.0 (26/10) — vẫn nhận
├── mosquitto/
│   ├── acl                                   # Quyền MQTT: trạm ghi số đo + đọc hệ số, backend thì ngược lại
│   └── mosquitto.conf                        # Cấu hình broker MQTT (bắt buộc đăng nhập)
├── public/
│   └── admin/
│       ├── admin.css                         # Trang admin: màu sắc, bố cục
│       ├── admin.js                          # ★ Trang admin: xem trạm, sửa vị trí/ngưỡng, công thức + Học lại ngay, tin nhắn lỗi, gửi thử
│       └── index.html                        # Trang admin: khung giao diện
├── scripts/
│   ├── fakeNodePublisher.ts                  # GIẢ LẬP 2 TRẠM TEST-A01, A02: gửi gói tin 3.1, nhận hệ số máy chủ gửi xuống (npm run fake-node)
│   ├── importReadings.ts                     # NHẬP DỮ LIỆU CŨ từ file .json/.jsonl/.csv (npm run import)
│   └── sql/xoa_du_lieu_cu_v3_1.sql           # Xóa dữ liệu cũ trước khi dùng gói tin 3.1 (chạy TAY 1 lần, giữ danh sách trạm)
├── sql/
│   ├── 001_create_tables.sql                 # ★ Tạo 4 bảng: nodes, readings, node_models, ingest_errors
│   ├── 002_iot_packet_v2.sql                 # Thêm cột lượng mưa + cường độ mưa cho gói tin bên IoT (26/10)
│   ├── 003_server_retraining.sql             # Gói tin 3.0 (tốc độ dâng) + máy chủ học lại: thêm cột, bảng nhật ký học (28/10)
│   └── 004_drain_rate.sql                    # Gói tin 3.1: thêm cột drain_mm_5min (V = tốc độ thoát nước) (29/10)
└── src/
    ├── config/
    │   ├── appConfig.ts                      # Toàn bộ cấu hình, đọc từ file .env
    │   ├── floodRules.ts                     # Ngưỡng mặc định khi node mới xuất hiện (cm nước trên mặt đường). Admin sửa riêng từng...
    │   ├── modelRules.ts                     # Công thức bản 3.1: biến H, V, R, S, dự báo 5 phút, topic gửi hệ số
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
    ├── era/                                  # Cầu nối E-Ra: máy chủ tự nghe broker E-Ra (README mục 2b)
    │   ├── createEraCollector.ts             # Gom các giá trị lẻ từ E-Ra thành 1 lần đo, tự tính tốc độ dâng
    │   ├── eraStatus.ts                      # Tình trạng cầu nối E-Ra — API /api/v1/health đọc từ đây
    │   ├── parseEraFieldMap.ts               # Đọc ERA_FIELD_MAP: trường E-Ra nào là ngập / mưa / triều, nhân bao nhiêu
    │   ├── readEraValues.ts                  # Lấy các số đo từ 1 tin trên broker E-Ra (3rd party JSON / config value)
    │   ├── startEraBridge.ts                 # ★ Kết nối broker E-Ra, nghe gateway, lưu số đo qua handleNodeMessage
    │   └── startEraBridgeFromConfig.ts       # Bật cầu nối nếu .env có ERA_GATEWAY_TOKEN, kiểm tra cấu hình trước
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
    │   ├── toStationDto.ts                   # Ghép node + lần đo mới nhất + công thức → 1 "trạm" gửi cho app
    │   └── toTrainingRunDto.ts               # Đổi 1 dòng nhật ký học sang dạng gửi cho trang admin.
    ├── mqtt/
    │   ├── getNodeIdFromTopic.ts             # Lấy mã node từ topic MQTT. Quy ước topic: smartflood/nodes/<mã node>/data
    │   ├── mqttClientHub.ts                  # GIỮ KẾT NỐI MQTT DÙNG CHUNG của backend: vừa NGHE dữ liệu trạm (subscribeNodeMessages),
    │   ├── mqttStatus.ts                     # Tình trạng kết nối MQTT hiện tại — API /api/v1/health đọc từ đây.
    │   ├── publishNodeModel.ts               # GỬI HỆ SỐ MỚI XUỐNG TRẠM qua MQTT, topic smartflood/nodes/<id>/model:
    │   ├── republishLatestServerModels.ts    # MQTT VỪA NỐI (LẠI) → gửi lại công thức mới nhất máy chủ đã học cho từng trạm.
    │   ├── startEmbeddedBroker.ts            # BẬT 1 BROKER MQTT NHÚNG (thư viện aedes) — chỉ dùng khi chạy thử trên laptop, để khôn...
    │   ├── subscribeNodeMessages.ts          # Kết nối MQTT, nghe số đo các trạm gửi lên (.../data)
    │   └── toModelMessage.ts                 # NỘI DUNG TIN NHẮN GỬI HỆ SỐ XUỐNG TRẠM (topic smartflood/nodes/<id>/model), ví dụ:
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
    │   │   ├── findLatestNodeModel.ts        # Phiên bản công thức MỚI NHẤT của 1 node (trạm gửi hay máy chủ học đều được); chưa có...
    │   │   ├── insertNodeModel.ts            # LƯU 1 PHIÊN BẢN CÔNG THỨC node vừa gửi. Node gửi lại phiên bản đã có thì bỏ qua (giữ...
    │   │   ├── insertServerModel.ts          # LƯU 1 PHIÊN BẢN CÔNG THỨC MÁY CHỦ VỪA HỌC. Số phiên bản = phiên bản lớn nhất hiện có + 1
    │   │   ├── listLatestServerModels.ts     # Với mỗi node: phiên bản công thức mới nhất, NẾU phiên bản đó do máy chủ học.
    │   │   ├── listNodeModels.ts             # Tất cả phiên bản công thức của 1 node, từ cũ đến mới (trạm gửi lên + máy chủ học, đán...
    │   │   ├── markModelApplied.ts           # Trạm gửi số đo có ghi "đang dùng phiên bản X" → đánh dấu phiên bản X đã được trạm áp...
    │   │   └── markModelPublished.ts         # Ghi lại lúc máy chủ gửi phiên bản này xuống trạm qua MQTT (chỉ ghi lần gửi đầu tiên).
    │   ├── nodes/
    │   │   ├── NodeSettings.ts               # Các thông tin admin được đặt cho 1 node (trang /admin → Sửa node). Trường nào không g...
    │   │   ├── createNode.ts                 # Admin tạo node mới trước khi node gửi dữ liệu. Mã node đã có thì báo lỗi (trả về false).
    │   │   ├── ensureNodeExists.ts           # Node lạ gửi dữ liệu lần đầu → tự tạo node mới (tên tạm = mã node, chưa có vị trí).
    │   │   ├── findNodeRecord.ts             # Lấy 1 node theo mã; không có thì trả về null.
    │   │   ├── listStationRows.ts            # Lấy các node kèm lần đo mới nhất + công thức mới nhất (1 câu SQL)
    │   │   ├── setNodeLocationIfMissing.ts   # Node gửi kèm tọa độ mà node CHƯA có vị trí thì lưu vào. Đã có vị trí (admin đặt) thì...
    │   │   ├── touchNodeLastMessage.ts       # Ghi lại "lần cuối máy chủ nhận tin nhắn trực tiếp của node" — dùng để tính online / m...
    │   │   └── updateNode.ts                 # Admin sửa thông tin node (chỉ sửa những trường có gửi lên). Trả về false nếu không có...
    │   ├── readings/
    │   │   ├── insertReading.ts              # LƯU 1 LẦN ĐO. Trả về true nếu lưu mới, false nếu đã có lần đo cùng node + cùng thời điểm
    │   │   └── listReadings.ts               # LỊCH SỬ ĐO của 1 node trong khoảng [from, to], tối đa `limit` lần đo MỚI NHẤT,
    │   └── training/
    │       ├── insertTrainingRun.ts          # Ghi 1 dòng nhật ký học (kể cả lần học không ra công thức mới).
    │       ├── listNodesToRetrain.ts         # Các node ĐANG HIỆN trên app và có số đo kể từ `since` — lượt tự học mỗi ngày chỉ học...
    │       ├── listTrainingPairs.ts          # GHÉP CẶP (lúc t → 5 phút sau) từ lịch sử đo của 1 trạm để học
    │       └── listTrainingRuns.ts           # Nhật ký học gần nhất của 1 node (mới nhất trước).
    ├── roads/
    │   ├── fetchRoadsAround.ts               # Lấy hình dạng các con đường quanh 1 điểm từ OpenStreetMap (Overpass)
    │   └── getFloodedRoadsForStation.ts      # Các đoạn đường bị ngập quanh 1 node (có nhớ tạm 12 giờ)
    ├── routes/
    │   ├── admin/
    │   │   ├── getAdminNodes.ts              # GET /api/v1/admin/nodes — mọi node, kể cả node đã ẩn, kèm tình trạng MQTT (trang admin).
    │   │   ├── getIngestErrors.ts            # GET /api/v1/admin/ingest-errors?limit=100 — các tin nhắn bị từ chối gần nhất và lý do.
    │   │   ├── getTrainingRuns.ts            # GET /api/v1/admin/nodes/:nodeId/training-runs?limit=20 — nhật ký các lần máy chủ học...
    │   │   ├── nodeSettingsSchema.ts         # Khuôn thông tin admin được sửa cho 1 node (mọi trường đều không bắt buộc).
    │   │   ├── patchAdminNode.ts             # PATCH /api/v1/admin/nodes/:nodeId — sửa tên, vị trí, ngưỡng, chu kỳ gửi, ẩn/hiện node.
    │   │   ├── postAdminNode.ts              # POST /api/v1/admin/nodes — tạo node mới (khai báo trước tên, vị trí, ngưỡng).
    │   │   ├── postImportReadings.ts         # POST /api/v1/admin/import  body: { "messages": [ {...}, {...} ] }  (tối đa 5000 tin m...
    │   │   ├── postRetrainNode.ts            # POST /api/v1/admin/nodes/:nodeId/retrain — nút "Học lại ngay" ở trang admin:
    │   │   └── postTestMessage.ts            # POST /api/v1/admin/messages  body: { "message": { ...1 tin nhắn giống node gửi... } }
    │   ├── public/
    │   │   ├── getHealth.ts                  # GET /api/v1/health — máy chủ còn sống không, DB và MQTT có kết nối không. Dùng để kiể...
    │   │   ├── getNearby.ts                  # GET /api/v1/nearby?lat=10.77&lng=106.66&radius=2000 — tình hình ngập quanh 1 vị trí (...
    │   │   ├── getStation.ts                 # GET /api/v1/stations/:nodeId — 1 trạm.
    │   │   ├── getStationModels.ts           # GET /api/v1/stations/:nodeId/models — các phiên bản công thức của trạm, từ cũ đến mới...
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
    ├── training/
    │   ├── TrainingSample.ts                 # 1 MẪU HỌC: số đo lúc t → độ ngập thật lúc t+5 phút.
    │   ├── fitLinearModel.ts                 # HỌC HỆ SỐ HỒI QUY TUYẾN TÍNH, KÉO VỀ GẦN HỆ SỐ CŨ (đúng ý "dùng hệ số cũ của trạm + m...
    │   ├── measureErrors.ts                  # ĐO SAI SỐ của 1 cách đoán trên các mẫu (đáp án = độ ngập thật lúc t+5 phút).
    │   ├── msUntilNextVietnamTime.ts         # Còn bao nhiêu mili-giây nữa tới HH:MM (giờ Việt Nam) lần kế tiếp. Đúng HH:MM rồi thì...
    │   ├── predictWithCoefficients.ts        # Ĥ(t+5) = a0 + a1·H + a2·V + a3·R + a4·S (mm). Âm thì coi là 0 — nước không thể sâu dư...
    │   ├── scheduleDailyRetraining.ts        # TỰ HỌC LẠI MỖI NGÀY vào giờ `timeText` ("00:30" = 0 giờ 30 đêm, giờ Việt Nam).
    │   ├── solveLinearSystem.ts              # GIẢI HỆ PHƯƠNG TRÌNH TUYẾN TÍNH A·x = b (A vuông) bằng khử Gauss, có đổi hàng để trán...
    │   ├── toCoefficientVector.ts            # Lấy hệ số [a0, aH, aV, aR, aS] từ 1 phiên bản công thức để học tiếp.
    │   ├── toTrainingSamples.ts              # CHỌN MẪU ĐỂ HỌC (chốt 28/10/2026): chỉ học lúc ĐANG NGẬP.
    │   ├── trainAllNodes.ts                  # HỌC LẠI CHO MỌI TRẠM có số đo trong N ngày gần nhất, lần lượt từng trạm, in kết quả r...
    │   └── trainNodeModel.ts                 # ★ MÁY CHỦ HỌC LẠI CÔNG THỨC 1 TRẠM: ghép cặp → học → kiểm tra → lưu → gửi xuống
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
    │   ├── StationDto.ts                     # Dạng dữ liệu 1 trạm / 1 lần đo / 1 công thức gửi cho app
    │   └── TrainingRunRecord.ts              # 1 dòng của bảng `model_training_runs`: 1 lần máy chủ học lại công thức cho 1 node.
    └── server.ts                             # ★ ĐIỂM KHỞI ĐỘNG: nối DB → bật API → nối MQTT → hẹn giờ học lại
```

Đọc code theo thứ tự này là dễ hiểu nhất:

1. `src/server.ts`: khởi động gồm những bước gì
2. `sql/001_create_tables.sql` + `002_...` + `003_...`: dữ liệu lưu thế nào
3. `src/ingest/handleNodeMessage.ts` → `parseNodeMessage.ts`: 1 tin nhắn node đi qua những bước nào, đổi đơn vị ra sao
4. `src/services/loadStations.ts` → `src/mappers/toStationDto.ts`: tính tình trạng trạm
5. `src/routes/registerPublicRoutes.ts`: app gọi được những API nào
6. `src/training/trainNodeModel.ts` → `fitLinearModel.ts` → `src/mqtt/publishNodeModel.ts`: máy chủ học lại công thức rồi gửi xuống trạm ra sao

---

## 8. Muốn sửa X thì sửa ở đâu

| Muốn | Sửa file |
|---|---|
| Đổi ngưỡng ngập mặc định, bán kính vùng ảnh hưởng, quy tắc online/offline | `src/config/floodRules.ts` |
| Đổi ngưỡng / vị trí **1 node cụ thể** | Trang admin → Xem / Sửa (không cần sửa code) |
| Node gửi thêm trường mới và muốn có cột riêng | **file mới** `sql/004_...sql` (thêm cột, không sửa file cũ) + `src/ingest/parseNodeMessage.ts` + `src/ingest/nodeMessageSchema.ts` + `src/repositories/readings/insertReading.ts` + `src/types/ReadingRecord.ts` + `src/mappers/toReadingDto.ts` |
| Đổi khoảng giá trị hợp lệ của 1 trường | `src/ingest/nodeMessageSchema.ts` |
| Bên IoT đổi tên trường / đơn vị gửi lên | `src/ingest/nodeMessageSchema.ts` (tên, khoảng) + `src/ingest/parseNodeMessage.ts` (đổi đơn vị) + [IOT_DATA_FORMAT.md](IOT_DATA_FORMAT.md) |
| Đổi cách xử lý giờ trạm gửi | `src/ingest/resolveMeasuredAt.ts` + `DEVICE_CLOCK_*` trong `src/config/floodRules.ts` |
| Thêm 1 API mới | Tạo file trong `src/routes/public/` rồi khai báo trong `src/routes/registerPublicRoutes.ts` |
| Đổi loại đường được tô màu | `src/roads/fetchRoadsAround.ts` (biến `ROAD_TYPES`) |
| Đổi câu thông báo kiểm tra tuyến | `src/routing/checkRoute.ts` |
| Giao diện trang admin | `public/admin/admin.js`, `admin.css` |
| Đổi giờ tự học, số ngày dữ liệu, số mẫu tối thiểu, độ "kéo về hệ số cũ" | `.env`: `MODEL_RETRAIN_TIME`, `MODEL_TRAINING_DAYS`, `MODEL_MIN_SAMPLES`, `MODEL_PRIOR_WEIGHT` (không cần sửa code) |
| Thêm/bớt biến trong công thức dự báo | `src/config/modelRules.ts` (`MODEL_VARIABLES`) + câu SQL trong `src/repositories/training/listTrainingPairs.ts` + `src/training/toTrainingSamples.ts` + [IOT_DATA_FORMAT.md](IOT_DATA_FORMAT.md) mục 5 (báo bên IoT) |
| Đổi cách chọn mẫu học (vd ngưỡng "đang ngập") | `src/training/toTrainingSamples.ts` |
| Đổi điều kiện nhận công thức mới | `src/training/trainNodeModel.ts` (bước 5) |

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
| Trạm gửi mà không thấy trong admin | Xem tab **Tin nhắn lỗi**. Không có gì ở đó thì trạm chưa tới được máy chủ: kiểm tra Wi-Fi (2.4 GHz), địa chỉ, cổng 1883, tài khoản/mật khẩu MQTT, topic |
| Bấm "Học lại ngay" báo "Chỉ có ... cặp mẫu lúc đang ngập" | Chưa đủ dữ liệu lúc đường ngập. Node giả: chạy thêm vài phút. Trạm thật: đợi có mưa ngập |
| Trạm không nhận được hệ số mới | Cột **Gửi về trạm lúc** trống → MQTT backend đang rớt. Có giờ nhưng **Trạm bắt đầu dùng** trống → trạm chưa subscribe `.../model`, hoặc chưa gửi `model_version`. Máy chủ thật: nhớ `docker compose restart mosquitto` sau khi cập nhật file `acl` |
| Node hiện "Mất kết nối" dù vẫn gửi | Chu kỳ gửi thật dài hơn chu kỳ khai báo. Sửa **Chu kỳ gửi (giây)** của node trong admin |
| "Quanh bạn" không tô màu đường mà vẽ vòng tròn | Máy chủ không gọi được Overpass (mạng chặn / dịch vụ quá tải). Log có dòng `[roads] Không lấy được đường...`; 2 phút sau tự thử lại |
| Kiểm tra tuyến ra đường thẳng | OSRM công cộng lỗi/quá tải. Kết quả ghi rõ "đang ước lượng bằng đường thẳng" |
| Máy chủ báo `phải đặt ADMIN_API_KEY dài ít nhất 16 ký tự` | Đặt khóa dài hơn trong `.env` |
| `docker compose up` báo `Chưa đặt POSTGRES_PASSWORD trong .env` | Chưa tạo file `.env` từ `.env.production.example` |

---

## 10. Giới hạn hiện tại (nói thẳng để khỏi bất ngờ)

- **"Đường ngập" là ước lượng.** Node chỉ đo được 1 điểm; các con đường trong bán kính 100–300 m quanh node được coi là ngập theo mức của node đó.
- **Chưa có thông báo đẩy (push)** khi app đang tắt. App chỉ báo khi đang mở.
- **Chưa có điều khiển còi/bơm.** Đường gửi ngược xuống trạm đã có (topic `.../model`), nhưng chưa làm lệnh điều khiển.
- **MQTT chưa mã hóa TLS** (mục 3).
- **OSRM và Overpass là dịch vụ miễn phí dùng chung**, có thể chậm hoặc từ chối khi quá tải; backend đã có giới hạn số lần gọi và phương án dự phòng. Dùng thật lâu dài thì nên tự dựng OSRM.
- **Công thức là hồi quy tuyến tính đơn giản**, chưa có hệ số ban đầu: trạm chỉ dự báo sau khi máy chủ có **ít nhất ~2,5 giờ dữ liệu lúc đường ngập**. Mùa khô có thể nhiều tuần không học được gì — đó là đúng, không phải lỗi. Sai số ghi trong admin/app đo trên chính dữ liệu của trạm, **không phải** kết quả kiểm chứng độc lập.
- **Học từ dữ liệu giả thì công thức cũng là giả**: node giả `TEST-...` chỉ để xem vòng học chạy, hệ số học ra không có ý nghĩa thật. Không đưa số liệu đó vào báo cáo.
- **Một số câu hỏi về dữ liệu chưa có câu trả lời** (mực nước đo so với mốc nào, lượng mưa về 0 khi nào, triều so với mốc nào...): xem mục 10 của [IOT_DATA_FORMAT.md](IOT_DATA_FORMAT.md).
- **Dữ liệu từ `npm run fake-node` là dữ liệu giả**: mã trạm `TEST-...`, có `"is_test": true`, trang admin gắn nhãn **THỬ**. **Không** chạy lệnh này vào máy chủ thật.
- Đã kiểm tra: `npm run typecheck`, chạy thật với PGlite và với PostgreSQL 16, MQTT, toàn bộ API, trang admin, nhập file JSON/CSV. Vòng học lại (28/10): chạy thật với trạm giả qua MQTT nhúng — bấm "Học lại ngay" và tự học theo giờ hẹn đều ra phiên bản mới, gửi xuống trạm giả, trạm giả dùng ngay và báo lại `model_version`; nâng cấp DB bản cũ lên bản mới giữ nguyên dữ liệu; với Mosquitto thật + file `acl` mới: backend gửi được hệ số, tài khoản trạm đọc được nhưng **không ghi được** topic `.../model`. **Chưa** chạy thử bằng `docker compose` (máy dùng để viết code không tải được image Docker), nên lần deploy đầu cần để ý log.
