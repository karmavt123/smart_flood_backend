# Đặc tả dữ liệu trạm ↔ máy chủ SmartFlood

> Gửi cho **bên IoT** (firmware trạm ESP32). **Phiên bản 3.0, ngày 28/10/2026.**
> Tin nhắn sai định dạng **không bị mất âm thầm**: máy chủ ghi lại kèm lý do ở trang `/admin` → **Tin nhắn lỗi**.
>
> **Đổi gì so với bản 2.0 (26/10):**
> - **Bỏ LoRa và gateway.** Mỗi trạm ESP32 tự bắt **Wi-Fi** và gửi MQTT thẳng lên máy chủ, **5 phút 1 lần**.
> - Gói tin có thêm **tốc độ dâng** (`rise_rate_mm_min`) và **độ ngập dự báo sau 5 phút** (`predicted_water_level_mm`).
> - **Công thức mới:** bỏ nhiệt độ, độ ẩm, ánh sáng; thêm **lượng mưa** và **thủy triều** (mục 5).
> - **Máy chủ học lại hệ số mỗi ngày** rồi gửi xuống trạm qua topic mới `smartflood/nodes/<id>/model` (mục 5.3).
> - Kiểu tin nhắn bản 2.0 và 1.0 vẫn nhận (mục 3.4).

---

## 1. Dữ liệu đi đường nào

```
                     số đo, 5 phút/lần (topic .../data)
Trạm (ESP32 + cảm biến) ──── Wi-Fi + MQTT ────▶ Máy chủ (Mosquitto → backend → PostgreSQL) ──▶ App / trang admin
                        ◀─── hệ số mới ────────                 │
                         (topic .../model)                       └─ mỗi ngày 00:30: học lại công thức cho từng trạm
```

- **Mỗi lần đo = 1 tin nhắn JSON**, trạm publish lên MQTT.
- Máy chủ **nhận, đổi đơn vị, lưu và hiển thị**: mức ngập (An toàn / Cảnh báo / Nguy hiểm / Rất nguy hiểm), tốc độ dâng, mưa, triều, dự báo, lịch sử đo.
- Máy chủ **học lại công thức dự báo** từ dữ liệu của chính trạm đó, rồi **gửi hệ số mới xuống trạm**. Trạm tự dự báo bằng hệ số đó, nên **mất mạng trạm vẫn dự báo được** (vd để bật còi, đèn tại chỗ).

## 2. Kết nối MQTT

| Mục | Giá trị |
|---|---|
| Wi-Fi | ESP32 chỉ bắt được **2.4 GHz** (không bắt được 5 GHz) |
| Địa chỉ | **`flood.agentwf.xyz`**, cổng **1883** (trang web + API: `https://flood.agentwf.xyz`) |
| Tài khoản | `smartflood-gateway` (tên cũ từ hồi còn gateway, giờ là **tài khoản chung của các trạm**) |
| Mật khẩu | anh mentor đưa riêng (**không** ghi vào code đưa lên GitHub) |
| Client ID | **mỗi trạm 1 tên riêng**, vd `station-A01`. 2 trạm trùng Client ID sẽ đá nhau rớt mạng liên tục |
| Topic GỬI số đo | `smartflood/nodes/<id>/data` — ví dụ `smartflood/nodes/A01/data` |
| Topic NHẬN hệ số | `smartflood/nodes/<id>/model` — trạm **subscribe** topic của chính mình |
| QoS | **1** (máy chủ chống lưu trùng nếu tin bị gửi lại) |
| Retain | `false` khi gửi số đo |
| Nội dung | JSON, mã hóa UTF-8, tối đa 16 KB |

Tài khoản trạm **chỉ được ghi** vào `smartflood/nodes/+/data` và **chỉ được đọc** `smartflood/nodes/+/model`.

> Thư viện **PubSubClient** (Arduino) chỉ **gửi** được QoS 0 và mặc định chỉ chứa tin ≤ 256 byte → gọi `setBufferSize(512)`. QoS 0 vẫn chạy, chỉ là lỡ rớt mạng đúng lúc gửi thì mất 1 lần đo. Muốn đúng QoS 1 thì dùng thư viện `arduino-mqtt` (256dpi) hoặc `esp-mqtt`.

## 3. Các trường của tin nhắn số đo

### 3.1. Gói tin bản 3.0

| Thông tin | Trường JSON | Kiểu | Đơn vị trạm gửi | Khoảng hợp lệ | Máy chủ lưu thành |
|---|---|---|---|---|---|
| Mã trạm | `id` | chuỗi | — | chữ không dấu, số, `-` `_` `.`; ≤ 64 ký tự | mã trạm, vd `A01` |
| Giờ đo | `time` | chuỗi | `"hh:mm:ss"` giờ VN | 00:00:00 → 23:59:59 | thời điểm đo (mục 4) |
| Ngày đo | `date` | chuỗi | `"2026-10-28"` | | **nên gửi** (Wi-Fi có NTP nên lấy được ngày) |
| Độ ngập hiện tại | `water_level_mm` | số | **mm** | −200 → 5000 | ÷ 10 → **cm** (để tính mức ngập) |
| Tốc độ dâng | `rise_rate_mm_min` | số | **mm/phút** | −1000 → 1000 | giữ nguyên. **Âm = nước đang rút** |
| Lượng mưa | `rain_mm` | số | **mm** | 0 → 100000 | giữ nguyên |
| Thủy triều | `tide_m` | số | **m** | −10 → 10 | × 100 → cm; app hiển thị lại theo **m** |
| Độ ngập dự báo sau 5 phút | `predicted_water_level_mm` | số | **mm** | −200 → 5000 | ÷ 10 → cm |
| Đang dùng công thức nào | `model_version` | số nguyên | — | ≥ 1 | để biết trạm đã nhận hệ số mới chưa |

**Bắt buộc** (thiếu thì tin nhắn bị từ chối): `id` (hoặc mã trong topic), `water_level_mm`, `rain_mm`, `tide_m`.

**Bắt buộc khi trạm đã có công thức:** `rise_rate_mm_min`, `predicted_water_level_mm`, `model_version`.
**Trạm chưa có công thức** (mới lắp, máy chủ chưa học xong) thì **không gửi** `predicted_water_level_mm` và `model_version` — app sẽ ghi "Trạm chưa có dự đoán", không tự bịa số.

**Tốc độ dâng tính thế nào:**

$$V = \frac{H(\text{bây giờ}) - H(\text{5 phút trước})}{5} \quad (\text{mm/phút})$$

Ví dụ 5 phút trước 113 mm, bây giờ 125 mm → $V = (125 - 113) / 5 = 2{,}4$ mm/phút. Mới bật máy, chưa có số đo 5 phút trước → **không gửi** `rise_rate_mm_min` (đừng gửi 0).

**Không đo được thì BỎ TRƯỜNG ĐÓ ĐI hoặc ghi `null`. Tuyệt đối không ghi `0` thay cho "không đo được"**, vì máy chủ sẽ hiểu là đo được 0 thật (vd mưa = 0 là "trời không mưa").

Số gửi dạng chuỗi (`"125"`, `"1.35"`) cũng nhận. Trường nào **không có trong bảng** (vd `fw_version`) vẫn được nhận và lưu nguyên vào cột `extra`.

### 3.2. Có thể gửi thêm (không bắt buộc)

| Trường | Kiểu | Đơn vị | Khoảng | Ý nghĩa |
|---|---|---|---|---|
| `model` | object | | | Toàn bộ công thức đang dùng (mục 5.4). Chỉ gửi ở **tin đầu tiên sau khi bật máy** và **ngay sau khi nhận hệ số mới** |
| `rssi_dbm` | số | dBm | −200 → 0 | Độ mạnh sóng Wi-Fi (`WiFi.RSSI()`) |
| `battery_pct` | số | % | 0 → 100 | Pin còn lại |
| `temperature_c` | số | °C | −20 → 80 | Nhiệt độ (không còn dùng trong công thức, gửi thì app vẫn hiện) |
| `rain_rate_mm_s` | số | mm/giây | 0 → 1 | Cường độ mưa (gói tin bản 2.0) |
| `location` | object | độ | | `{ "lat": 10.7769, "lng": 106.7009 }` — chỉ dùng khi trạm **chưa có vị trí** trên máy chủ |

App **ẩn** mục nào trạm không gửi.

### 3.3. Mức ngập tính thế nào

Máy chủ so **độ sâu nước ngập (cm)** = `water_level_mm ÷ 10` với ngưỡng của từng trạm (admin sửa được, mặc định):

| Độ sâu | Mức |
|---|---|
| < 10 cm | An toàn |
| 10 → < 25 cm | Cảnh báo |
| 25 → < 40 cm | Nguy hiểm |
| ≥ 40 cm | Rất nguy hiểm |

> ⚠ Máy chủ đang hiểu `water_level_mm` là **độ sâu nước trên mặt đường (đường khô = 0)**. Nếu thật ra là cao độ so với 1 mốc khác thì mức ngập sẽ sai — xem câu hỏi 1, mục 10.

### 3.4. Kiểu tin nhắn cũ (vẫn nhận)

| Bản 3.0 | Bản 1.0 tương đương |
|---|---|
| `id` | `node_id` |
| `time` (+ `date`) | `measured_at` (ISO 8601 hoặc số Unix) |
| `water_level_mm` (mm) | `flood_depth_cm` (cm) |
| `tide_m` (m) | `tide_cm` (cm) |
| `rain_mm` | `rain_mm_1h` (tổng mưa 60 phút gần nhất, mm) |
| `predicted_water_level_mm` | `prediction: { "depth_cm": 15.1, "horizon_min": 5 }` |

**Chỉ gửi 1 trong 2 tên** cho cùng 1 thông tin. Gửi cả `tide_m` lẫn `tide_cm` thì bị từ chối (dễ nhầm đơn vị).

## 4. Thời gian

Trạm có Wi-Fi nên **lấy được giờ chuẩn qua mạng (NTP)** — nên gửi cả `time` lẫn `date`.

| Trạm gửi | Ví dụ | Máy chủ hiểu là |
|---|---|---|
| Giờ + ngày (**nên dùng**) | `"time": "14:05:30", "date": "2026-10-28"` | đúng ngày giờ đó, giờ Việt Nam |
| Chỉ có giờ | `"time": "14:05:30"` | **giờ Việt Nam, ngày hôm nay** (lúc máy chủ nhận) |
| ISO 8601 / số Unix | `"2026-10-28T14:05:30+07:00"`, `1792998330` | đúng múi giờ ghi |

- Giờ trạm **nhanh hơn** giờ máy chủ quá 5 phút → coi là đồng hồ sai, **vẫn nhận tin** nhưng dùng giờ máy chủ, ghi giờ trạm vào `extra.device_time_rejected`.
- Chỉ gửi giờ (không có ngày) mà **chậm hơn** giờ máy chủ quá 15 phút → cũng dùng giờ máy chủ (vì không đoán được ngày). Có `date` thì không bị giới hạn này → **mất Wi-Fi một lúc có thể lưu tạm số đo rồi gửi bù**, miễn là có `date`.
- Không gửi `time` → dùng giờ máy chủ nhận.
- 2 tin nhắn **cùng trạm, cùng thời điểm đo** thì coi là trùng, chỉ lưu 1 lần.

## 5. Công thức dự báo và vòng học lại

### 5.1. Công thức (bản 3.0)

$$\hat{H}(t+5) = a_0 + a_1 H + a_2 V + a_3 R + a_4 S$$

| Biến | Ý nghĩa | Lấy từ trường | Đơn vị |
|---|---|---|---|
| $H$ | độ ngập hiện tại | `water_level_mm` | mm |
| $V$ | tốc độ dâng | `rise_rate_mm_min` | mm/phút |
| $R$ | lượng mưa | `rain_mm` | mm |
| $S$ | thủy triều | `tide_m` | m |
| $\hat{H}(t+5)$ | độ ngập dự báo 5 phút tới | gửi ở `predicted_water_level_mm` | mm |

**Hệ số dùng ĐÚNG đơn vị trong gói tin**, trạm cứ thế thay số vào, không phải đổi đơn vị. Kết quả âm thì gửi 0.

Công thức cũ trong báo cáo ($H, V$, nhiệt độ $T$, độ ẩm $RH$, ánh sáng $L$) **không dùng nữa**.

### 5.2. Máy chủ học lại thế nào

1. **Mỗi ngày lúc 00:30** (giờ VN), với từng trạm: ghép cặp *(số đo lúc t → độ ngập thật lúc t+5 phút)* trong **30 ngày gần nhất**.
2. **Chỉ học lúc đường đang ngập**: bỏ cặp mà độ ngập lúc t **và** lúc t+5 phút đều ≤ 0. Giữ cặp lúc t còn khô nhưng 5 phút sau đã có nước (lúc nước *bắt đầu* lên — lúc cần dự báo nhất).
3. Cần **ít nhất 30 cặp** như vậy (≈ 2,5 giờ ngập), và độ ngập trong đó phải có lên có xuống (nước đứng yên suốt thì chưa học được gì). Chưa đủ thì giữ công thức cũ.
4. Học hệ số mới, **kéo về gần hệ số trạm đang dùng** (dùng cả hệ số cũ lẫn dữ liệu mới). Trạm chưa có công thức thì kéo về công thức đơn giản nhất $\hat{H} = H + 5V$ ("nước tiếp tục dâng đúng tốc độ hiện tại") — chỉ dùng làm điểm tựa khi học, không gửi xuống trạm.
5. Giữ 20% dữ liệu mới nhất để **kiểm tra**: chỉ nhận công thức mới khi **sai số nhỏ hơn** công thức đang dùng. Trạm chưa có công thức thì phải tốt hơn cách đoán "5 phút nữa nước vẫn như bây giờ".
6. Lưu phiên bản mới (v1, v2, v3…) và **gửi xuống trạm** qua MQTT.

Admin có nút **"Học lại ngay"** ở trang `/admin` → **Xem / Sửa** trạm, để học ngay lúc bấm (vd lúc demo). Mỗi lần học, kể cả lần không ra công thức mới, đều có ghi lý do trong **Nhật ký học lại**.

### 5.3. Trạm nhận hệ số mới

Trạm **subscribe** `smartflood/nodes/<id>/model` (QoS 1). Máy chủ gửi tin **retained** — trạm đang tắt hay mất Wi-Fi thì **lúc nối lại vẫn nhận được** bản mới nhất. Nội dung (file `examples/model-message.example.json`):

```json
{
  "version": 2,
  "horizon_min": 5,
  "intercept": 1.2,
  "coef": { "H": 0.97, "V": 4.9, "R": 0.03, "S": 2.1 },
  "trained_at": "2026-10-28T17:30:05.000Z",
  "samples": 146,
  "mae_mm": 3.4
}
```

Trạm làm 4 việc:

1. **Chỉ đổi công thức khi `version` LỚN HƠN bản đang dùng** (máy chủ có thể gửi lại bản cũ khi nối lại mạng).
2. **Lưu hệ số vào bộ nhớ flash** (thư viện `Preferences`), để mất điện bật lại vẫn còn.
3. Tin số đo kế tiếp gửi kèm `"model": { ... }` (đúng nội dung vừa nhận) **1 lần**, rồi các tin sau chỉ cần `model_version`.
4. Từ đó tính `predicted_water_level_mm` bằng hệ số mới.

### 5.4. Gửi công thức đang dùng lên (trường `model`)

```json
"model": { "version": 2, "horizon_min": 5, "intercept": 1.2, "coef": { "H": 0.97, "V": 4.9, "R": 0.03, "S": 2.1 } }
```

Nếu sau này bên IoT tự có hệ số ban đầu (vd học từ dữ liệu cũ), cũng gửi theo cách này với `version` = 1: máy chủ sẽ học tiếp từ đó.

## 6. Ví dụ

**Trạm đã có công thức v2** (file `examples/node-message.example.json`):

```json
{
  "id": "A01",
  "date": "2026-10-28",
  "time": "14:05:30",
  "water_level_mm": 125,
  "rise_rate_mm_min": 2.4,
  "rain_mm": 12.5,
  "tide_m": 1.35,
  "predicted_water_level_mm": 137,
  "model_version": 2
}
```

Máy chủ lưu: ngập **12,5 cm** (Cảnh báo), đang dâng **2,4 mm/phút**, mưa **12,5 mm**, triều **1,35 m**, dự báo 5 phút tới **13,7 cm**, dùng công thức v2.

**Trạm mới lắp, chưa có công thức** (file `examples/node-message.minimal.json`):

```json
{ "id": "A01", "date": "2026-10-28", "time": "14:05:30", "water_level_mm": 0, "rise_rate_mm_min": 0, "rain_mm": 0, "tide_m": 1.2 }
```

## 7. Code ESP32 mẫu (khung chính)

Arduino, thư viện **PubSubClient** + **ArduinoJson 7**. Các hàm `docMucNuocMm()`, `docLuongMuaMm()`, `docTrieuM()` là phần đọc cảm biến, bên IoT tự viết.

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <time.h>

const char* ID = "A01";
const char* TOPIC_DATA  = "smartflood/nodes/A01/data";
const char* TOPIC_MODEL = "smartflood/nodes/A01/model";

WiFiClient net;
PubSubClient mqtt(net);
Preferences store;

// Công thức đang dùng: version = 0 nghĩa là CHƯA có
int modelVersion = 0;
float a0, aH, aV, aR, aS;
bool baoCongThucMoi = false;

float mucNuoc5PhutTruoc = NAN;     // để tính tốc độ dâng

void nhanCongThuc(char* topic, byte* payload, unsigned int length) {
  JsonDocument doc;
  if (deserializeJson(doc, payload, length)) return;      // không phải JSON → bỏ
  int v = doc["version"] | 0;
  if (v <= modelVersion) return;                           // bản cũ hoặc trùng → bỏ
  modelVersion = v;
  a0 = doc["intercept"]; aH = doc["coef"]["H"]; aV = doc["coef"]["V"];
  aR = doc["coef"]["R"]; aS = doc["coef"]["S"];
  store.putInt("ver", v); store.putFloat("a0", a0); store.putFloat("aH", aH);
  store.putFloat("aV", aV); store.putFloat("aR", aR); store.putFloat("aS", aS);
  baoCongThucMoi = true;
}

void setup() {
  store.begin("congthuc");
  modelVersion = store.getInt("ver", 0);                   // bật lại máy vẫn còn công thức cũ
  a0 = store.getFloat("a0"); aH = store.getFloat("aH"); aV = store.getFloat("aV");
  aR = store.getFloat("aR"); aS = store.getFloat("aS");
  baoCongThucMoi = modelVersion > 0;                       // tin đầu tiên sau khi bật: báo công thức đang dùng

  WiFi.begin("TEN_WIFI", "MAT_KHAU_WIFI");
  while (WiFi.status() != WL_CONNECTED) delay(500);
  configTime(7 * 3600, 0, "pool.ntp.org");                 // giờ Việt Nam qua mạng
  mqtt.setServer("flood.agentwf.xyz", 1883);
  mqtt.setBufferSize(512);
  mqtt.setCallback(nhanCongThuc);
}

void guiSoDo() {
  struct tm t;
  if (!getLocalTime(&t)) return;                           // chưa có giờ → đợi lần sau
  float H = docMucNuocMm(), R = docLuongMuaMm(), S = docTrieuM();

  JsonDocument doc;
  doc["id"] = ID;
  char ngay[11], gio[9];
  strftime(ngay, sizeof ngay, "%Y-%m-%d", &t); strftime(gio, sizeof gio, "%H:%M:%S", &t);
  doc["date"] = ngay; doc["time"] = gio;
  doc["water_level_mm"] = H; doc["rain_mm"] = R; doc["tide_m"] = S;

  if (!isnan(mucNuoc5PhutTruoc)) {
    float V = (H - mucNuoc5PhutTruoc) / 5.0;               // mm/phút
    doc["rise_rate_mm_min"] = V;
    if (modelVersion > 0) {
      float duBao = a0 + aH * H + aV * V + aR * R + aS * S;
      doc["predicted_water_level_mm"] = duBao < 0 ? 0 : duBao;
      doc["model_version"] = modelVersion;
      if (baoCongThucMoi) {
        JsonObject m = doc["model"].to<JsonObject>();
        m["version"] = modelVersion; m["horizon_min"] = 5; m["intercept"] = a0;
        m["coef"]["H"] = aH; m["coef"]["V"] = aV; m["coef"]["R"] = aR; m["coef"]["S"] = aS;
        baoCongThucMoi = false;
      }
    }
  }
  mucNuoc5PhutTruoc = H;

  char json[512];
  serializeJson(doc, json);
  mqtt.publish(TOPIC_DATA, json);
}

void loop() {
  if (!mqtt.connected()) {
    if (mqtt.connect("station-A01", "smartflood-gateway", "MAT_KHAU_MQTT")) {
      mqtt.subscribe(TOPIC_MODEL, 1);                      // nghe hệ số mới (tin retained tới ngay)
    } else { delay(5000); return; }
  }
  mqtt.loop();                                             // PHẢI gọi thường xuyên để nhận được hệ số

  static unsigned long lanGuiTruoc = 0;
  if (lanGuiTruoc == 0 || millis() - lanGuiTruoc >= 5UL * 60 * 1000) {   // 5 phút 1 lần
    lanGuiTruoc = millis();
    guiSoDo();
  }
}
```

> Trạm dùng **ngủ sâu (deep sleep)** để tiết kiệm pin thì `mucNuoc5PhutTruoc` phải lưu vào `RTC_DATA_ATTR`, và sau mỗi lần thức dậy phải gọi `mqtt.loop()` vài giây để kịp nhận tin hệ số.

## 8. Thử trước khi nối trạm thật

**Cách 1: trang admin, không cần MQTT.** Mở `https://flood.agentwf.xyz/admin`, nhập khóa admin, tab **Gửi thử · Thêm node**: ô nhập có sẵn 1 gói tin mẫu bản 3.0, sửa số rồi bấm **Gửi**. Trang báo **✓ Đã lưu** hoặc **✗ Bị từ chối: <lý do>**.

**Cách 2: dòng lệnh, không cần MQTT:**

```bash
curl -X POST https://flood.agentwf.xyz/api/v1/admin/messages \
  -H "Content-Type: application/json" -H "x-admin-key: <KHÓA_ADMIN>" \
  -d '{"message": {"id":"ND-THU-01","time":"14:05:30","water_level_mm":125,"rise_rate_mm_min":2.4,"rain_mm":12.5,"tide_m":1.35}}'
```

**Cách 3: qua MQTT thật** (máy có cài `mosquitto-clients`):

```bash
# Gửi 1 số đo
mosquitto_pub -h flood.agentwf.xyz -p 1883 -u smartflood-gateway -P '<mật khẩu>' -q 1 \
  -t smartflood/nodes/ND-THU-01/data \
  -m '{"water_level_mm":125,"rise_rate_mm_min":2.4,"rain_mm":12.5,"tide_m":1.35}'

# Xem hệ số máy chủ gửi xuống cho 1 trạm
mosquitto_sub -h flood.agentwf.xyz -p 1883 -u smartflood-gateway -P '<mật khẩu>' -q 1 -v -t smartflood/nodes/A01/model
```

> Gửi thử thì dùng mã kiểu `ND-THU-01`, **đừng dùng `A01`/`A02`** — không thì dữ liệu thử lẫn vào trạm thật (và bị đem đi học công thức).

Trạm lạ gửi lần đầu được **tự tạo**, vào **Xem / Sửa** để điền tên và **vị trí** (A01, A02 không gửi tọa độ nên admin phải nhập tay, không thì trạm không hiện trên bản đồ).

Lý do bị từ chối hay gặp (xem tab **Tin nhắn lỗi**):

| Lý do | Sửa |
|---|---|
| `Không phải JSON hợp lệ` | Thiếu dấu ngoặc / dấu phẩy, hoặc dùng dấu `'` thay cho `"` |
| `tide_m: thiếu thủy triều (bắt buộc)` | Gửi đủ: độ ngập, mưa, triều |
| `rain_mm: thiếu thông tin mưa` | Thêm `rain_mm` |
| `water_level_mm: phải là số` | Gửi chữ như `"abc"` hoặc `"N/A"`. Không đo được thì bỏ trường / ghi `null` |
| `model_version 3 khác model.version 2` | Gửi `model` kèm thì 2 số phiên bản phải giống nhau |
| `predicted_water_level_mm và prediction: cùng là dự báo` | Chỉ gửi `predicted_water_level_mm` |
| `id "A01" khác mã node trong topic "A02"` | Mã trong tin và trong topic phải giống nhau |

## 9. Nhập dữ liệu đã đo trước đó vào DB

Định dạng **giống hệt tin nhắn MQTT**, nhưng **bắt buộc có ngày + giờ** (`date` + `time`). Nhận 3 kiểu file:

- `.json`: mảng `[ {...}, {...} ]` (xem `examples/import-sample.json`)
- `.jsonl`: mỗi dòng 1 object JSON
- `.csv`: dòng đầu là tên cột, vd `id,date,time,water_level_mm,rise_rate_mm_min,rain_mm,tide_m` (xem `examples/import-sample.csv`). Ô trống = không có dữ liệu, không phải 0. Lưu từ Excel dạng **CSV UTF-8**.

```bash
npm run import -- du-lieu.csv --api https://flood.agentwf.xyz --key <KHÓA_ADMIN>
```

Nhập lại cùng file **không bị trùng**. Dữ liệu cũ nhập vào **cũng được dùng để học công thức** (nếu nằm trong 30 ngày gần nhất).

## 10. Câu hỏi còn mở (cần bên IoT trả lời)

| # | Câu hỏi | Vì sao cần |
|---|---|---|
| 1 | **`water_level_mm`** là độ sâu nước trên mặt đường (đường khô = 0) hay cao độ so với 1 mốc nào đó? | Máy chủ lấy số này so ngưỡng 10 / 25 / 40 cm, và chỉ học lúc số này > 0 |
| 2 | **`rain_mm`** về 0 khi nào: mưa trong 5 phút vừa qua, đầu ngày, hay lúc bật trạm? | Nếu cộng dồn mãi không về 0 thì hệ số $a_3$ của mưa học ra không có ý nghĩa |
| 3 | **`tide_m`** so với mốc nào (hệ cao độ quốc gia, số 0 hải đồ…), lấy từ nguồn nào? | Để ghi chú đúng trên app và trong báo cáo |
| 4 | **Tọa độ** (vĩ độ, kinh độ) và địa chỉ của A01, A02? | Để hiện trạm trên bản đồ |
| 5 | Chỗ đặt trạm có **Wi-Fi 2.4 GHz ổn định** không? Mất Wi-Fi thì trạm có lưu tạm số đo để gửi bù không? | Gửi bù được nếu có `date` (mục 4) |
| 6 | Xác nhận **tên trường** bản 3.0 như mục 3.1 | Sai 1 chữ là máy chủ báo thiếu trường |

## 11. Checklist cho bên IoT

- [ ] Mỗi trạm có `id` cố định, không trùng (`A01`, `A02`…) và **Client ID MQTT riêng**
- [ ] Gửi 5 phút 1 lần: `water_level_mm`, `rain_mm`, `tide_m`, `rise_rate_mm_min` đúng đơn vị bảng 3.1
- [ ] Không đo được thì bỏ trường / `null`, **không ghi 0**
- [ ] `time` + `date` lấy từ NTP, giờ Việt Nam
- [ ] Subscribe `smartflood/nodes/<id>/model`, chỉ nhận bản có `version` lớn hơn, lưu hệ số vào flash
- [ ] Đã có công thức thì gửi `predicted_water_level_mm` + `model_version`; vừa nhận công thức mới thì gửi kèm `model` 1 lần
- [ ] Đã gửi thử và thấy **✓ Đã lưu** ở trang admin
- [ ] Đã trả lời các câu hỏi mục 10
