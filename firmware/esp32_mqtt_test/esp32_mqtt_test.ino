// THỬ KẾT NỐI: ESP32 → hotspot laptop → broker MQTT nhúng của backend.
// Chỉ để kiểm tra đường truyền — gửi SỐ GIẢ, chưa đọc cảm biến.
// Cần: board ESP32 + thư viện PubSubClient (Nick O'Leary). Serial Monitor để 115200.
#include <WiFi.h>
#include <PubSubClient.h>

const char* WIFI_TEN     = "TEN_HOTSPOT";        // hotspot của laptop, PHẢI là 2.4 GHz
const char* WIFI_MATKHAU = "MAT_KHAU_HOTSPOT";   // điền xong đừng commit mật khẩu thật lên GitHub
const char* BROKER       = "192.168.137.1";      // IP laptop khi bật hotspot (xem bằng ipconfig)
const int   CONG         = 1883;

// Mã THỬ — chưa dùng A01/A02 để khỏi lẫn dữ liệu giả vào trạm thật.
const char* MA_TRAM     = "ND-THU-01";
const char* CLIENT_ID   = "station-ND-THU-01";   // mỗi ESP32 1 tên riêng, trùng là đá nhau rớt mạng
const char* TOPIC_DATA  = "smartflood/nodes/ND-THU-01/data";
const char* TOPIC_MODEL = "smartflood/nodes/ND-THU-01/model";

WiFiClient net;
PubSubClient mqtt(net);

// Máy chủ gửi hệ số xuống thì in ra (bản thử chưa dùng hệ số).
void nhanTin(char* topic, byte* payload, unsigned int len) {
  Serial.printf("[MQTT] Nhan o %s: %.*s\n", topic, (int)len, (char*)payload);
}

void noiWifi() {
  Serial.printf("[WiFi] Dang noi \"%s\"", WIFI_TEN);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_TEN, WIFI_MATKHAU);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print('.'); }
  Serial.printf("\n[WiFi] OK, IP cua ESP32: %s\n", WiFi.localIP().toString().c_str());
}

void noiMqtt() {
  while (!mqtt.connected()) {
    Serial.printf("[MQTT] Dang noi %s:%d ... ", BROKER, CONG);
    if (mqtt.connect(CLIENT_ID)) {                // broker tren laptop khong can tai khoan
      Serial.println("OK");
      mqtt.subscribe(TOPIC_MODEL);
    } else {
      Serial.printf("LOI, ma %d -> thu lai sau 5 giay\n", mqtt.state());
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  noiWifi();
  mqtt.setServer(BROKER, CONG);
  mqtt.setBufferSize(512);
  mqtt.setCallback(nhanTin);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) noiWifi();
  if (!mqtt.connected()) noiMqtt();
  mqtt.loop();                                     // phai goi thuong xuyen moi nhan duoc tin

  static unsigned long lanTruoc = 0;
  if (lanTruoc == 0 || millis() - lanTruoc >= 10000) {   // thu: 10 giay 1 lan (tram that: 5 phut)
    lanTruoc = millis();
    static float H = 100;
    H += random(-5, 15);                           // so gia, cho len xuong cho vui
    if (H < 0) H = 0;
    char json[256];
    snprintf(json, sizeof json,
             "{\"id\":\"%s\",\"water_level_mm\":%.0f,\"rise_rate_mm_min\":%.1f,\"rain_mm\":%.1f,\"tide_m\":%.2f}",
             MA_TRAM, H, 1.5, 2.0, 1.20);
    bool ok = mqtt.publish(TOPIC_DATA, json);
    Serial.printf("[MQTT] Gui %s: %s\n", ok ? "OK" : "LOI", json);
  }
}
