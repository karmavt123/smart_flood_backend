// =====================================================================
// SMARTFLOOD — KHUNG GỬI SỐ ĐO TỪ ESP32 LÊN MÁY CHỦ (MQTT, 5 phút/lần) — gói tin 3.1
//
// File này chỉ lo: nối Wi-Fi, nối MQTT, lấy giờ Việt Nam, NHẬN hệ số công thức từ máy chủ,
// và GỬI 5 giá trị lên máy chủ. Phần ĐO + TÍNH TOÁN nhóm IoT viết vào hàm docSoLieu() bên dưới.
//
// 5 giá trị gửi lên (đơn vị bắt buộc):
//   H      độ ngập hiện tại              mm      = (độ cao cảm biến lúc đường khô − khoảng cách đo được) × 10, không âm
//                                                 → KHÔNG phải khoảng cách cảm biến đo được
//   H5     độ ngập dự đoán sau 5 phút    mm
//   V      tốc độ thoát nước (cống rãnh) mm/5 phút, luôn ≥ 0 (thoát càng nhiều số càng lớn) — BẮT BUỘC
//   R      lượng mưa trong 5 phút        mm/5 phút
//   S      thủy triều                    m
// Giá trị nào CHƯA CÓ thì để NAN → không gửi trường đó (KHÔNG ghi 0: 0 nghĩa là đo được 0 thật).
//
// Chạy trên Wokwi: để DUNG_WOKWI 1. Trạm thật: đổi thành 0 và điền Wi-Fi.
// ⚠ Mật khẩu MQTT: không đưa lên GitHub; trên Wokwi đừng bấm Save/Share khi đã điền mật khẩu.
// =====================================================================
#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <time.h>

#define DUNG_WOKWI 1

// ---------------- CẤU HÌNH ----------------
const char* WIFI_TEN     = "TEN_WIFI";               // trạm thật: Wi-Fi 2.4 GHz có Internet
const char* WIFI_MATKHAU = "MAT_KHAU_WIFI";

const char* MQTT_HOST = "flood.agentwf.xyz";
const int   MQTT_PORT = 1883;
const char* MQTT_USER = "smartflood-gateway";
const char* MQTT_PASS = "DIEN_MAT_KHAU_MQTT";        // anh mentor gửi riêng

const char* MA_TRAM = "A01";                         // chạy thử thì dùng mã bắt đầu bằng TEST-, vd "TEST-WOKWI"

const unsigned long GUI_MOI_MS = 5UL * 60 * 1000;    // 5 phút/lần

// ---------------- TRẠNG THÁI ----------------
WiFiClient net;
PubSubClient mqtt(net);
char topicData[96], topicModel[96], clientId[64];

// Công thức máy chủ gửi xuống (nhóm IoT dùng các hệ số này để tính H5).
// phienBan = 0 nghĩa là chưa nhận được công thức nào.
int   phienBan = 0;
float a0 = 0, aH = 0, aV = 0, aR = 0, aS = 0;

// =====================================================================
// PHẦN CỦA NHÓM IOT: đo và tính 5 giá trị, ghi vào H, H5, V, R, S
// =====================================================================
void docSoLieu(float& H, float& H5, float& V, float& R, float& S) {
  H  = NAN;   // TODO: độ ngập hiện tại (mm)
  H5 = NAN;   // TODO: độ ngập dự đoán sau 5 phút (mm), vd a0 + aH*H + aV*V + aR*R + aS*S
  V  = NAN;   // TODO: tốc độ thoát nước (mm/5 phút)
  R  = NAN;   // TODO: lượng mưa trong 5 phút (mm/5 phút)
  S  = NAN;   // TODO: thủy triều (m)
}

// =====================================================================
// GỬI 1 LẦN ĐO LÊN MÁY CHỦ
// =====================================================================
bool guiSoDo(float H, float H5, float V, float R, float S) {
  if (isnan(H)) {
    Serial.println("[GUI] Chua co do ngap -> khong gui");
    return false;
  }
  if (!mqtt.connected()) {
    Serial.println("[GUI] MQTT chua ket noi -> khong gui");
    return false;
  }

  JsonDocument doc;
  doc["id"] = MA_TRAM;

  // Ngày giờ đo theo giờ Việt Nam (UTC+7). Chưa đồng bộ được giờ thì bỏ, máy chủ dùng giờ lúc nhận.
#if !DUNG_WOKWI
  struct tm t;
  if (getLocalTime(&t, 100) && t.tm_year + 1900 >= 2024) {
    char ngay[11], gio[9];
    strftime(ngay, sizeof ngay, "%Y-%m-%d", &t);
    strftime(gio, sizeof gio, "%H:%M:%S", &t);
    doc["date"] = ngay;
    doc["time"] = gio;
  }
#endif
  // (Wokwi chạy chậm hơn giờ thật nên đồng hồ chip ảo trễ dần → không gửi giờ, để máy chủ ghi giờ nhận.)

  doc["water_level_mm"] = roundf(H < 0 ? 0 : H);
  if (!isnan(H5)) doc["predicted_water_level_mm"] = roundf(H5 < 0 ? 0 : H5);
  if (!isnan(V))  doc["drain_mm_5min"] = roundf(V * 10) / 10;
  if (!isnan(R))  doc["rain_mm"] = roundf(R * 10) / 10;            // lượng mưa trong 5 phút
  if (!isnan(S))  doc["tide_m"] = roundf(S * 100) / 100;
  if (!isnan(H5) && phienBan > 0) doc["model_version"] = phienBan;  // dự báo này tính bằng công thức số mấy

  char json[384];
  size_t n = serializeJson(doc, json, sizeof json);
  bool ok = mqtt.publish(topicData, (const uint8_t*)json, n, false);
  Serial.printf("[GUI] %s: %s\n", ok ? "OK" : "LOI", json);
  if (isnan(V) || isnan(R) || isnan(S)) Serial.println("      ! thieu V (thoat nuoc), mua hoac trieu -> may chu se TU CHOI tin nay");
  if (isnan(H5)) Serial.println("      (chua co du bao H5 -> app ghi \"Chua co thong tin\" o o Sau 5 phut)");
  return ok;
}

// =====================================================================
// NHẬN CÔNG THỨC MỚI TỪ MÁY CHỦ (topic smartflood/nodes/<mã>/model)
// {"version":3,"intercept":2.5,"coef":{"H":0.98,"V":-0.4,"R":0.6,"S":1.2},...}
// =====================================================================
void nhanCongThuc(char* topic, byte* payload, unsigned int length) {
  JsonDocument doc;
  if (deserializeJson(doc, payload, length)) return;
  int v = doc["version"] | 0;
  if (v <= phienBan) return;                                       // bản cũ / trùng → bỏ
  phienBan = v;
  a0 = doc["intercept"] | 0.0f;
  aH = doc["coef"]["H"] | 0.0f;
  aV = doc["coef"]["V"] | 0.0f;
  aR = doc["coef"]["R"] | 0.0f;
  aS = doc["coef"]["S"] | 0.0f;
  Serial.printf("[MODEL] Nhan cong thuc v%d: H5 = %.3f + %.4f*H + %.4f*V + %.4f*R + %.4f*S\n", v, a0, aH, aV, aR, aS);
}

// =====================================================================
// WI-FI + MQTT
// =====================================================================
void noiWifi() {
  Serial.print("[WiFi] Dang noi");
#if DUNG_WOKWI
  WiFi.begin("Wokwi-GUEST", "", 6);
#else
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_TEN, WIFI_MATKHAU);
#endif
  unsigned long batDau = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - batDau < 30000) { delay(500); Serial.print('.'); }
  Serial.println(WiFi.status() == WL_CONNECTED ? " OK" : " THAT BAI (thu lai sau)");
}

void giuMqtt() {
  if (mqtt.connected()) { mqtt.loop(); return; }
  static unsigned long lanThu = 0;
  if (lanThu != 0 && millis() - lanThu < 5000) return;
  lanThu = millis();
  Serial.printf("[MQTT] Dang noi %s:%d ... ", MQTT_HOST, MQTT_PORT);
  if (mqtt.connect(clientId, MQTT_USER, MQTT_PASS)) {
    Serial.println("OK");
    mqtt.subscribe(topicModel, 1);
  } else {
    Serial.printf("LOI, ma %d (5 = sai mat khau, -2 = khong toi duoc may chu)\n", mqtt.state());
  }
}

// =====================================================================
void setup() {
  Serial.begin(115200);
  delay(300);
  snprintf(topicData, sizeof topicData, "smartflood/nodes/%s/data", MA_TRAM);
  snprintf(topicModel, sizeof topicModel, "smartflood/nodes/%s/model", MA_TRAM);
  snprintf(clientId, sizeof clientId, "station-%s", MA_TRAM);

  noiWifi();
  configTime(7 * 3600, 0, "pool.ntp.org", "time.google.com");     // giờ Việt Nam UTC+7
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setBufferSize(512);
  mqtt.setKeepAlive(120);
  mqtt.setCallback(nhanCongThuc);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) noiWifi();
  giuMqtt();

  static unsigned long lanGui = 0;
  if ((lanGui == 0 && millis() > 3000) || (lanGui != 0 && millis() - lanGui >= GUI_MOI_MS)) {
    lanGui = millis();
    float H, H5, V, R, S;
    docSoLieu(H, H5, V, R, S);
    guiSoDo(H, H5, V, R, S);
  }
}
