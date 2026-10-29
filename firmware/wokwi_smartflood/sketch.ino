// TRẠM SMARTFLOOD GIẢ LẬP TRÊN WOKWI (wokwi.com) — gửi THẲNG lên máy chủ SmartFlood qua MQTT.
// Làm đúng việc của trạm thật (gói tin 3.0, IOT_DATA_FORMAT.md), chỉ thay cảm biến bằng 3 núm vặn:
//   núm 1 (GPIO34) = độ ngập 0 → 500 mm   (vặn lên = nước dâng)
//   núm 2 (GPIO35) = lượng mưa 0 → 50 mm
//   núm 3 (GPIO32) = thủy triều 0 → 3 m
// Vòng đầy đủ: gửi số đo → máy chủ học công thức → gửi hệ số xuống → trạm dùng để dự báo 5 phút tới.
//
// ⚠ MẬT KHẨU MQTT: chỉ dán vào lúc chạy thử. ĐỪNG bấm Save/Share project có mật khẩu
//   (project Wokwi miễn phí là CÔNG KHAI, ai cũng xem được code).
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <time.h>

// ---------- Cấu hình ----------
const char* MQTT_HOST = "flood.agentwf.xyz";
const int   MQTT_PORT = 1883;
const char* MQTT_USER = "smartflood-gateway";
const char* MQTT_PASS = "DIEN_MAT_KHAU_MQTT";      // anh mentor gửi riêng — xem cảnh báo ở trên

const char* MA_TRAM     = "TEST-WOKWI";             // mã thử: TEST- để không lẫn với trạm thật
const char* CLIENT_ID   = "station-TEST-WOKWI";
const char* TOPIC_DATA  = "smartflood/nodes/TEST-WOKWI/data";
const char* TOPIC_MODEL = "smartflood/nodes/TEST-WOKWI/model";

// Vị trí trạm thử trên bản đồ app (chỉ dùng lần đầu, khi trạm chưa có vị trí). Mặc định: ĐH Bách Khoa.
const double VI_DO   = 10.7724;
const double KINH_DO = 106.6580;

// Trạm thật gửi 5 phút/lần; giả lập gửi 30 giây/lần cho nhanh thấy kết quả.
const unsigned long GUI_MOI_MS = 30UL * 1000;

const int PIN_NGAP = 34, PIN_MUA = 35, PIN_TRIEU = 32;   // chân ADC1 (ADC2 không dùng được khi bật Wi-Fi)

// ---------- Trạng thái ----------
WiFiClient net;
PubSubClient mqtt(net);

int   modelVersion = 0;                  // 0 = chưa có công thức
float a0 = 0, aH = 0, aV = 0, aR = 0, aS = 0;
bool  baoCongThuc = false;               // gửi kèm "model" ở tin ngay sau khi nhận công thức mới
bool  daGuiViTri = false;

// Lịch sử độ ngập để tính tốc độ dâng (so với ~5 phút trước).
const int LICH_SU = 24;                  // 24 × 30 giây = 12 phút
unsigned long lsLuc[LICH_SU];
float lsNgap[LICH_SU];
int lsSo = 0, lsDau = 0;

float docNum(int pin, float maxValue) {
  return analogRead(pin) * maxValue / 4095.0;          // ADC ESP32: 0 → 4095
}

// Nhận hệ số mới từ máy chủ (topic .../model), chỉ nhận bản MỚI HƠN bản đang dùng.
void nhanCongThuc(char* topic, byte* payload, unsigned int length) {
  JsonDocument doc;
  if (deserializeJson(doc, payload, length)) {
    Serial.println("[MODEL] Tin he so khong phai JSON -> bo qua");
    return;
  }
  int v = doc["version"] | 0;
  if (v <= modelVersion) return;
  modelVersion = v;
  a0 = doc["intercept"] | 0.0f;
  aH = doc["coef"]["H"] | 0.0f;
  aV = doc["coef"]["V"] | 0.0f;
  aR = doc["coef"]["R"] | 0.0f;
  aS = doc["coef"]["S"] | 0.0f;
  baoCongThuc = true;
  Serial.printf("[MODEL] Nhan cong thuc v%d: H^ = %.3f + %.4f*H + %.4f*V + %.4f*R + %.4f*S\n", v, a0, aH, aV, aR, aS);
}

void noiWifi() {
  Serial.print("[WiFi] Dang noi Wokwi-GUEST");
  WiFi.begin("Wokwi-GUEST", "", 6);
  while (WiFi.status() != WL_CONNECTED) { delay(250); Serial.print('.'); }
  Serial.println(" OK");
}

void noiMqtt() {
  while (!mqtt.connected()) {
    Serial.printf("[MQTT] Dang noi %s:%d ... ", MQTT_HOST, MQTT_PORT);
    if (mqtt.connect(CLIENT_ID, MQTT_USER, MQTT_PASS)) {
      Serial.println("OK");
      mqtt.subscribe(TOPIC_MODEL, 1);      // tin he so "retained" toi ngay neu may chu da hoc
    } else {
      Serial.printf("LOI, ma %d (5 = sai mat khau) -> thu lai sau 5 giay\n", mqtt.state());
      delay(5000);
    }
  }
}

// Tốc độ dâng (mm/phút) so với lần đo cách đây 5 phút ± 90 giây. Chưa có thì trả NAN (KHÔNG gửi, đừng gửi 0).
float tinhTocDoDang(unsigned long now, float H) {
  int tot = -1;
  long lechTot = 0;
  for (int i = 0; i < lsSo; i++) {
    int k = (lsDau + i) % LICH_SU;
    long tuoi = (long)((now - lsLuc[k]) / 1000);
    long lech = labs(tuoi - 300);
    if (lech <= 90 && (tot < 0 || lech < lechTot)) { tot = k; lechTot = lech; }
  }
  if (tot < 0) return NAN;
  float phut = (now - lsLuc[tot]) / 60000.0;
  return (H - lsNgap[tot]) / phut;
}

void ghiLichSu(unsigned long now, float H) {
  int k;
  if (lsSo == LICH_SU) { k = lsDau; lsDau = (lsDau + 1) % LICH_SU; }   // day → ghi de lan cu nhat
  else { k = (lsDau + lsSo) % LICH_SU; lsSo++; }
  lsLuc[k] = now;
  lsNgap[k] = H;
}

void guiSoDo() {
  unsigned long now = millis();
  float H = roundf(docNum(PIN_NGAP, 500));             // mm
  float R = roundf(docNum(PIN_MUA, 50) * 10) / 10;     // mm
  float S = roundf(docNum(PIN_TRIEU, 3) * 100) / 100;  // m
  float V = tinhTocDoDang(now, H);
  ghiLichSu(now, H);

  JsonDocument doc;
  doc["id"] = MA_TRAM;
  struct tm t;
  if (getLocalTime(&t, 100)) {                          // co gio NTP thi gui kem ngay gio
    char ngay[11], gio[9];
    strftime(ngay, sizeof ngay, "%Y-%m-%d", &t);
    strftime(gio, sizeof gio, "%H:%M:%S", &t);
    doc["date"] = ngay;
    doc["time"] = gio;
  }
  doc["water_level_mm"] = H;
  doc["rain_mm"] = R;
  doc["tide_m"] = S;
  if (!isnan(V)) {
    doc["rise_rate_mm_min"] = roundf(V * 100) / 100;
    if (modelVersion > 0) {
      float duBao = a0 + aH * H + aV * V + aR * R + aS * S;
      doc["predicted_water_level_mm"] = roundf(duBao < 0 ? 0 : duBao);
      doc["model_version"] = modelVersion;
      if (baoCongThuc) {                                // bao cho may chu biet tram DA DUNG cong thuc moi
        JsonObject m = doc["model"].to<JsonObject>();
        m["version"] = modelVersion; m["horizon_min"] = 5; m["intercept"] = a0;
        m["coef"]["H"] = aH; m["coef"]["V"] = aV; m["coef"]["R"] = aR; m["coef"]["S"] = aS;
        baoCongThuc = false;
      }
    }
  }
  if (!daGuiViTri) {
    JsonObject loc = doc["location"].to<JsonObject>();
    loc["lat"] = VI_DO;
    loc["lng"] = KINH_DO;
  }
  doc["is_test"] = true;
  doc["rssi_dbm"] = WiFi.RSSI();

  char json[512];
  size_t n = serializeJson(doc, json, sizeof json);
  bool ok = mqtt.publish(TOPIC_DATA, (const uint8_t*)json, n, false);
  if (ok) daGuiViTri = true;
  Serial.printf("[MQTT] Gui %s: %s\n", ok ? "OK" : "LOI", json);
  if (isnan(V)) Serial.println("       (chua du 5 phut lich su -> chua co toc do dang / du bao)");
}

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  noiWifi();
  configTime(7 * 3600, 0, "pool.ntp.org");             // gio Viet Nam
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setBufferSize(512);
  mqtt.setCallback(nhanCongThuc);
  Serial.println("Van num 1 de doi do ngap, num 2 = mua, num 3 = trieu.");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) noiWifi();
  if (!mqtt.connected()) noiMqtt();
  mqtt.loop();                                          // PHAI goi thuong xuyen moi nhan duoc he so

  static unsigned long lanTruoc = 0;
  if (lanTruoc == 0 || millis() - lanTruoc >= GUI_MOI_MS) {
    lanTruoc = millis();
    guiSoDo();
  }
}
