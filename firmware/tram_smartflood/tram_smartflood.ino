// =====================================================================
// TRẠM SMARTFLOOD — gửi THẲNG lên máy chủ SmartFlood qua MQTT (gói tin 3.0, xem IOT_DATA_FORMAT.md)
// Dựa trên code trạm hiện tại của nhóm IoT (totally.cpp, wfi.cpp, gateway.cpp), bỏ LoRa:
//   - Độ ngập:   cảm biến siêu âm A02YYUW (UART) đo KHOẢNG CÁCH → độ ngập = chiều cao lắp − khoảng cách
//   - Lượng mưa: loadcell + HX711 cân lượng nước mưa hứng được (giả định — xem CAN_XAC_NHAN bên dưới)
//   - Thủy triều: lấy từ API Seamark (bảng thủy triều của Trung tâm KTTV quốc gia), trạm Sài Gòn
//   - Nhận hệ số công thức máy chủ học được → tự dự báo độ ngập 5 phút tới
//
// CHẠY GIẢ LẬP TRÊN WOKWI: để GIA_LAP 1 (dùng cảm biến HC-SR04 có thanh kéo thay cho A02YYUW).
// NẠP VÀO TRẠM THẬT:       đổi GIA_LAP thành 0, tạo file secrets.h (xem secrets.example.h).
// PlatformIO: chép file này thành src/main.cpp (các file .cpp khác trong src/ phải tắt hết setup/loop).
//
// CAN_XAC_NHAN với nhóm IoT:
//   1. CAO_CAM_BIEN_CM: khoảng cách từ cảm biến xuống MẶT ĐƯỜNG KHÔ — phải đo thực tế.
//   2. Loadcell có đúng là để đo mưa không? Nếu đúng: miệng phễu hứng mưa rộng bao nhiêu (DIEN_TICH_PHEU_M2)?
// =====================================================================
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <HX711.h>
#include <Preferences.h>
#include <time.h>

// ---------------- CHẾ ĐỘ ----------------
#define GIA_LAP 1   // 1 = Wokwi, 0 = trạm thật

// ---------------- BÍ MẬT (không đưa lên GitHub) ----------------
#if __has_include("secrets.h")
#include "secrets.h"
#else
#define WIFI_TEN     "TEN_WIFI"
#define WIFI_MATKHAU "MAT_KHAU_WIFI"
#define MQTT_PASS    "DIEN_MAT_KHAU_MQTT"   // ⚠ Wokwi: điền ở đây khi chạy thử, ĐỪNG bấm Save/Share
#endif

// ---------------- MÁY CHỦ ----------------
const char* MQTT_HOST = "flood.agentwf.xyz";
const int   MQTT_PORT = 1883;
const char* MQTT_USER = "smartflood-gateway";

#if GIA_LAP
const char* MA_TRAM = "TEST-WOKWI";                    // mã thử, không lẫn với trạm thật
const unsigned long GUI_MOI_MS = 30UL * 1000;          // giả lập: 30 giây/lần cho nhanh thấy
const float CAO_CAM_BIEN_CM = 100.0;                   // HC-SR04 để 100 cm = đường khô
const float HE_SO_HX711 = 420.0;                       // loadcell 5kg của Wokwi: 2100 đơn vị / 5 kg
#else
const char* MA_TRAM = "A01";
const unsigned long GUI_MOI_MS = 5UL * 60 * 1000;      // trạm thật: 5 phút/lần
const float CAO_CAM_BIEN_CM = 100.0;                   // CAN_XAC_NHAN 1: đo thực tế rồi sửa
const float HE_SO_HX711 = 100000.0;                    // giữ như code cũ, cần hiệu chuẩn lại
#endif
const float DIEN_TICH_PHEU_M2 = 0.02;                  // CAN_XAC_NHAN 2: phễu Ø16 cm ≈ 0,02 m²

// Thủy triều (API Seamark): 1 kg nước trên 1 m² = 1 mm mưa; triều = mực nước so với "số 0 hải đồ" (m)
const char* API_THUY_TRIEU = "https://tides.seamark.com.vn/api/v1/tide/stations/sai_gon/panel?hours=24";
const unsigned long LAY_TRIEU_MOI_MS = 10UL * 60 * 1000;

// ---------------- CHÂN ----------------
const int HX711_DT = 13, HX711_SCK = 12;               // như code cũ
#if GIA_LAP
const int SR04_TRIG = 5, SR04_ECHO = 18;               // HC-SR04 trong Wokwi
#else
const int A02_RX = 32, A02_TX = 33;                    // A02YYUW, như code cũ
#endif

// ---------------- TRẠNG THÁI ----------------
WiFiClient net;
PubSubClient mqtt(net);
HX711 canMua;
Preferences boNho;

String topicData, topicModel, clientId;

// Độ ngập: cộng dồn các lần đo hợp lệ giữa 2 lần gửi rồi lấy trung bình (đỡ nhiễu)
float tongKhoangCach = 0;
int soLanDo = 0;

// Lượng mưa
bool daTare = false;
float mucMuaMm = NAN;

// Thủy triều
float trieuM = NAN, trieuTocDoMPerH = 0;
unsigned long trieuLuc = 0, lanLayTrieu = 0;
bool daLayTrieu = false;

// Công thức máy chủ gửi xuống
int modelVersion = 0;
float a0 = 0, aH = 0, aV = 0, aR = 0, aS = 0;
bool baoCongThuc = false;

// Lịch sử độ ngập để tính tốc độ dâng (so với ~5 phút trước)
const int LICH_SU = 24;
unsigned long lsLuc[LICH_SU];
float lsNgap[LICH_SU];
int lsSo = 0, lsDau = 0;

// =====================================================================
// CẢM BIẾN
// =====================================================================
void ghiKhoangCach(float cm) {
  if (cm <= 0 || cm > 450) return;                      // ngoài tầm đo → bỏ
  tongKhoangCach += cm;
  soLanDo++;
}

#if GIA_LAP
void docSieuAm() {                                      // HC-SR04: đo độ dài xung ECHO
  static unsigned long lanTruoc = 0;
  if (millis() - lanTruoc < 500) return;
  lanTruoc = millis();
  digitalWrite(SR04_TRIG, LOW);  delayMicroseconds(2);
  digitalWrite(SR04_TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(SR04_TRIG, LOW);
  unsigned long us = pulseIn(SR04_ECHO, HIGH, 30000);
  if (us > 0) ghiKhoangCach(us * 0.0343 / 2);
}
#else
uint8_t khung[4];
uint8_t viTri = 0;
void docSieuAm() {                                      // A02YYUW: khung 4 byte FF H L SUM (mm)
  while (Serial2.available() > 0) {
    uint8_t b = Serial2.read();
    if (viTri == 0 && b != 0xFF) continue;
    khung[viTri++] = b;
    if (viTri == 4) {
      viTri = 0;
      if (((khung[0] + khung[1] + khung[2]) & 0xFF) == khung[3]) {
        uint16_t mm = ((uint16_t)khung[1] << 8) | khung[2];
        if (mm >= 30 && mm <= 4500) ghiKhoangCach(mm / 10.0);
      }
    }
  }
}
#endif

void docMua() {
  if (!canMua.is_ready()) return;
  if (!daTare) {                                        // lúc bật máy: phễu phải RỖNG
    canMua.set_offset(canMua.read_average(10));
    daTare = true;
    Serial.println("[MUA] Da can chinh ZERO (phieu phai rong luc bat may)");
    return;
  }
  float kg = (canMua.read() - canMua.get_offset()) / HE_SO_HX711;
  if (kg < 0) kg = 0;
  mucMuaMm = kg / DIEN_TICH_PHEU_M2;                    // 1 kg / 1 m² = 1 mm
}

// =====================================================================
// THỦY TRIỀU (API Seamark)
// =====================================================================
void layThuyTrieu() {
  WiFiClientSecure tls;
  tls.setInsecure();                                    // chỉ để thử; trạm thật nên kiểm chứng chỉ
  HTTPClient http;
  http.setTimeout(15000);
  if (!http.begin(tls, API_THUY_TRIEU)) { Serial.println("[TRIEU] Khong mo duoc HTTPS"); return; }
  int ma = http.GET();
  if (ma != HTTP_CODE_OK) {
    Serial.printf("[TRIEU] Loi HTTP %d\n", ma);
    http.end();
    return;
  }
  JsonDocument boLoc;                                   // chỉ đọc mục "now.forecast" cho nhẹ RAM
  boLoc["now"]["forecast"]["height"] = true;
  boLoc["now"]["forecast"]["rate_m_per_h"] = true;
  JsonDocument doc;
  DeserializationError loi = deserializeJson(doc, http.getString(), DeserializationOption::Filter(boLoc));
  http.end();
  if (loi || doc["now"]["forecast"]["height"].isNull()) {
    Serial.println("[TRIEU] Khong doc duoc now.forecast.height");
    return;
  }
  trieuM = doc["now"]["forecast"]["height"].as<float>();
  trieuTocDoMPerH = doc["now"]["forecast"]["rate_m_per_h"] | 0.0f;
  trieuLuc = millis();
  daLayTrieu = true;
  Serial.printf("[TRIEU] Tram Sai Gon: %.2f m (%+.2f m/gio)\n", trieuM, trieuTocDoMPerH);
}

// Triều lúc này: lấy số API + tốc độ lên/xuống × thời gian đã qua (tối đa 15 phút).
// Lần lấy được gần nhất đã quá 2 giờ → không dùng nữa (trả NAN).
float trieuHienTai() {
#if GIA_LAP
  // Chỉ khi giả lập: Wokwi không gọi được API (mạng ảo chập chờn) thì dùng tạm 1,5 m để vẫn thử tiếp được.
  if (!daLayTrieu) {
    Serial.println("[TRIEU] Chua lay duoc API -> GIA LAP dung tam 1.5 m");
    return 1.5;
  }
#endif
  if (!daLayTrieu) return NAN;
  float gio = (millis() - trieuLuc) / 3600000.0;
  if (gio > 2) return NAN;
  if (gio > 0.25) gio = 0.25;
  return trieuM + trieuTocDoMPerH * gio;
}

// =====================================================================
// CÔNG THỨC TỪ MÁY CHỦ
// =====================================================================
void nhanCongThuc(char* topic, byte* payload, unsigned int length) {
  JsonDocument doc;
  if (deserializeJson(doc, payload, length)) return;
  int v = doc["version"] | 0;
  if (v <= modelVersion) return;                        // bản cũ / trùng → bỏ
  modelVersion = v;
  a0 = doc["intercept"] | 0.0f;
  aH = doc["coef"]["H"] | 0.0f;
  aV = doc["coef"]["V"] | 0.0f;
  aR = doc["coef"]["R"] | 0.0f;
  aS = doc["coef"]["S"] | 0.0f;
  boNho.putInt("ver", v);
  boNho.putFloat("a0", a0); boNho.putFloat("aH", aH); boNho.putFloat("aV", aV);
  boNho.putFloat("aR", aR); boNho.putFloat("aS", aS);
  baoCongThuc = true;
  Serial.printf("[MODEL] Nhan cong thuc v%d: H^ = %.3f + %.4f*H + %.4f*V + %.4f*R + %.4f*S\n", v, a0, aH, aV, aR, aS);
}

// =====================================================================
// TỐC ĐỘ DÂNG
// =====================================================================
float tinhTocDoDang(unsigned long now, float H) {        // NAN = chưa có số đo ~5 phút trước
  int tot = -1;
  long lechTot = 0;
  for (int i = 0; i < lsSo; i++) {
    int k = (lsDau + i) % LICH_SU;
    long lech = labs((long)((now - lsLuc[k]) / 1000) - 300);
    if (lech <= 90 && (tot < 0 || lech < lechTot)) { tot = k; lechTot = lech; }
  }
  if (tot < 0) return NAN;
  return (H - lsNgap[tot]) / ((now - lsLuc[tot]) / 60000.0);
}

void ghiLichSu(unsigned long now, float H) {
  int k;
  if (lsSo == LICH_SU) { k = lsDau; lsDau = (lsDau + 1) % LICH_SU; }
  else { k = (lsDau + lsSo) % LICH_SU; lsSo++; }
  lsLuc[k] = now;
  lsNgap[k] = H;
}

// =====================================================================
// GỬI SỐ ĐO
// =====================================================================
void guiSoDo() {
  if (soLanDo == 0) {
    Serial.println("[GUI] Chua co so do sieu am hop le -> chua gui");
    return;
  }
  float khoangCach = tongKhoangCach / soLanDo;
  tongKhoangCach = 0;
  soLanDo = 0;

  float ngapCm = CAO_CAM_BIEN_CM - khoangCach;
  if (ngapCm < 0) ngapCm = 0;                           // đường khô, sai số cảm biến
  float H = roundf(ngapCm * 10);                        // mm
  float R = isnan(mucMuaMm) ? NAN : roundf(mucMuaMm * 10) / 10;
  float S = trieuHienTai();
  if (!isnan(S)) S = roundf(S * 100) / 100;
  unsigned long now = millis();
  float V = tinhTocDoDang(now, H);
  ghiLichSu(now, H);

  JsonDocument doc;
  doc["id"] = MA_TRAM;
  struct tm t;
  if (getLocalTime(&t, 100)) {
    char ngay[11], gio[9];
    strftime(ngay, sizeof ngay, "%Y-%m-%d", &t);
    strftime(gio, sizeof gio, "%H:%M:%S", &t);
    doc["date"] = ngay;
    doc["time"] = gio;
  }
  doc["water_level_mm"] = H;
  if (!isnan(R)) doc["rain_mm"] = R;                    // không đo được thì BỎ, không ghi 0
  if (!isnan(S)) doc["tide_m"] = S;
  if (!isnan(V)) {
    doc["rise_rate_mm_min"] = roundf(V * 100) / 100;
    if (modelVersion > 0 && !isnan(R) && !isnan(S)) {
      float duBao = a0 + aH * H + aV * V + aR * R + aS * S;
      doc["predicted_water_level_mm"] = roundf(duBao < 0 ? 0 : duBao);
      doc["model_version"] = modelVersion;
      if (baoCongThuc) {                                // báo máy chủ: trạm đã dùng công thức này
        JsonObject m = doc["model"].to<JsonObject>();
        m["version"] = modelVersion; m["horizon_min"] = 5; m["intercept"] = a0;
        m["coef"]["H"] = aH; m["coef"]["V"] = aV; m["coef"]["R"] = aR; m["coef"]["S"] = aS;
        baoCongThuc = false;
      }
    }
  }
  doc["rssi_dbm"] = WiFi.RSSI();
#if GIA_LAP
  static bool daGuiViTri = false;                       // trạm thử: tự đặt lên bản đồ (ĐH Bách Khoa)
  if (!daGuiViTri) {
    doc["location"]["lat"] = 10.7724;
    doc["location"]["lng"] = 106.6580;
    daGuiViTri = true;
  }
  doc["is_test"] = true;
#endif

  char json[512];
  size_t n = serializeJson(doc, json, sizeof json);
  bool ok = mqtt.publish(topicData.c_str(), (const uint8_t*)json, n, false);
  Serial.printf("[GUI] %s (khoang cach %.1f cm): %s\n", ok ? "OK" : "LOI", khoangCach, json);
  if (isnan(S)) Serial.println("      ⚠ chua co thuy trieu -> may chu se TU CHOI tin nay");
  if (isnan(R)) Serial.println("      ⚠ chua co luong mua -> may chu se TU CHOI tin nay");
  if (isnan(V)) Serial.println("      (chua du 5 phut lich su -> chua co toc do dang / du bao)");
}

// =====================================================================
// WI-FI + MQTT
// =====================================================================
void noiWifi() {
  Serial.print("[WiFi] Dang noi");
#if GIA_LAP
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
  if (mqtt.connect(clientId.c_str(), MQTT_USER, MQTT_PASS)) {
    Serial.println("OK");
    mqtt.subscribe(topicModel.c_str(), 1);              // hệ số "retained" tới ngay nếu máy chủ đã học
  } else {
    Serial.printf("LOI, ma %d (5 = sai mat khau, -2 = khong toi duoc may chu)\n", mqtt.state());
  }
}

// =====================================================================
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.printf("\n===== TRAM SMARTFLOOD %s (%s) =====\n", MA_TRAM, GIA_LAP ? "GIA LAP" : "THAT");

  topicData = String("smartflood/nodes/") + MA_TRAM + "/data";
  topicModel = String("smartflood/nodes/") + MA_TRAM + "/model";
  clientId = String("station-") + MA_TRAM;

#if GIA_LAP
  pinMode(SR04_TRIG, OUTPUT);
  pinMode(SR04_ECHO, INPUT);
#else
  Serial2.begin(9600, SERIAL_8N1, A02_RX, A02_TX);
#endif
  canMua.begin(HX711_DT, HX711_SCK);

  boNho.begin("congthuc");                              // bật lại máy vẫn còn công thức cũ
  modelVersion = boNho.getInt("ver", 0);
  a0 = boNho.getFloat("a0", 0); aH = boNho.getFloat("aH", 0); aV = boNho.getFloat("aV", 0);
  aR = boNho.getFloat("aR", 0); aS = boNho.getFloat("aS", 0);
  baoCongThuc = modelVersion > 0;                       // tin đầu tiên sau khi bật: báo công thức đang dùng

  noiWifi();
  configTime(7 * 3600, 0, "pool.ntp.org", "time.google.com");   // giờ Việt Nam
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setBufferSize(512);
  mqtt.setCallback(nhanCongThuc);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) noiWifi();
  giuMqtt();
  docSieuAm();
  docMua();

  if (WiFi.status() == WL_CONNECTED && (lanLayTrieu == 0 || millis() - lanLayTrieu >= LAY_TRIEU_MOI_MS)) {
    lanLayTrieu = millis();
    layThuyTrieu();
  }

  static unsigned long lanGui = 0;
  // Lần gửi đầu: đợi 5 giây cho cảm biến kịp đo vài lần
  if ((lanGui == 0 && millis() > 5000) || (lanGui != 0 && millis() - lanGui >= GUI_MOI_MS)) {
    lanGui = millis();
    if (mqtt.connected()) guiSoDo();
  }
}
