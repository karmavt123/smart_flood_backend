// MAU — chep file nay thanh "secrets.h" (cung thu muc) roi dien that.
// secrets.h nam trong .gitignore nen KHONG bi day len GitHub.
#pragma once

// Wi-Fi 2.4 GHz CO INTERNET: hotspot laptop, Wi-Fi nha/truong deu duoc.
#define WIFI_TEN      "TEN_WIFI"
#define WIFI_MATKHAU  "MAT_KHAU_WIFI"

// Tai khoan MQTT chung cua cac tram (anh mentor gui rieng mat khau).
#define MQTT_USER     "smartflood-gateway"
#define MQTT_PASS     "MAT_KHAU_MQTT"

// --- Cach 1: MAY CHU THAT ---
#define MQTT_HOST     "flood.agentwf.xyz"
#define GUI_MOI_GIAY  60      // may chu that: dung spam, 60 giay 1 lan la du de thu

// --- Cach 2: BROKER TREN LAPTOP (backend chay npm run dev, ESP32 bat hotspot laptop) ---
// Xoa 2 dong Cach 1 o tren, bo dau // o 2 dong duoi. Broker laptop nhan moi tai khoan.
// #define MQTT_HOST     "192.168.137.1"
// #define GUI_MOI_GIAY  10
