// THỬ KẾT NỐI: ESP32 → Wi-Fi → broker MQTT (máy chủ thật hoặc broker trên laptop).
// Chỉ để kiểm tra đường truyền — gửi SỐ GIẢ, chưa đọc cảm biến.
// Cần: board ESP32 + thư viện PubSubClient (Nick O'Leary). Serial Monitor để 115200.
//
// TRƯỚC KHI NẠP: chép secrets.example.h thành secrets.h (cùng thư mục), điền Wi-Fi + mật khẩu MQTT.
#include <WiFi.h>
#include <PubSubClient.h>
#include "secrets.h"   // báo lỗi "No such file" = chưa tạo secrets.h

const int CONG = 1883;

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
    Serial.printf("[MQTT] Dang noi %s:%d ... ", MQTT_HOST, CONG);
    if (mqtt.connect(CLIENT_ID, MQTT_USER, MQTT_PASS)) {
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
  mqtt.setServer(MQTT_HOST, CONG);
  mqtt.setBufferSize(512);
  mqtt.setCallback(nhanTin);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) noiWifi();
  if (!mqtt.connected()) noiMqtt();
  mqtt.loop();                                     // phai goi thuong xuyen moi nhan duoc tin

  static unsigned long lanTruoc = 0;
  if (lanTruoc == 0 || millis() - lanTruoc >= GUI_MOI_GIAY * 1000UL) {   // tram that: 5 phut 1 lan
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
