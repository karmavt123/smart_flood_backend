# SmartFlood Mobile App: Đặc tả (SPEC)

| | |
|---|---|
| **Mã tài liệu** | SF-APP-SPEC-001 |
| **Phiên bản** | 1.0 (23/10/2026) |
| **Đề tài** | SMARTFLOOD: hệ thống IoT giám sát, cảnh báo sớm và hỗ trợ định tuyến tránh ngập đô thị |
| **Căn cứ** | `SmartFlood_App_Requirements.pdf` (SF-APP-REQ-001 v1.0, 07/10/2026), mã FR-01 → FR-15 và NFR-01 → NFR-06 |
| **Máy chủ dùng chung** | https://smartflood.vn (web và app dùng chung API, tài khoản, quy tắc nghiệp vụ) |
| **Đọc kèm** | `README.md` (cách cài và chạy, cây thư mục, lỗi thường gặp), `SmartFlood_Danh_sach_van_de.docx` (lỗi của máy chủ) |

**Tài liệu này khác README ở đâu?** README trả lời "chạy app thế nào, sửa gì ở đâu". SPEC trả lời **"app phải làm gì, làm đến đâu, và đúng khi nào"**: các quy tắc bắt buộc, hành vi từng chức năng, dữ liệu, giao tiếp với máy chủ, tiêu chí nghiệm thu, và những gì chưa làm. Nội dung ở đây là mô tả đúng với code ở thời điểm 23/10/2026; nếu code đổi thì sửa SPEC cùng lúc.

---

## Mục lục

1. [Mục tiêu, phạm vi, người dùng](#1-mục-tiêu-phạm-vi-người-dùng)
2. [Quy tắc bắt buộc](#2-quy-tắc-bắt-buộc)
3. [Kiến trúc](#3-kiến-trúc)
4. [Mô hình dữ liệu](#4-mô-hình-dữ-liệu)
5. [Màn hình và điều hướng](#5-màn-hình-và-điều-hướng)
6. [Đặc tả chức năng FR-01 → FR-15](#6-đặc-tả-chức-năng)
7. [Giao tiếp với máy chủ](#7-giao-tiếp-với-máy-chủ)
8. [Cấu hình và hằng số](#8-cấu-hình-và-hằng-số)
9. [Yêu cầu phi chức năng](#9-yêu-cầu-phi-chức-năng)
10. [Trường hợp biên và xử lý lỗi](#10-trường-hợp-biên-và-xử-lý-lỗi)
11. [Chế độ DEMO](#11-chế-độ-demo)
12. [Giới hạn đã biết và việc chưa làm](#12-giới-hạn-đã-biết-và-việc-chưa-làm)
13. [Nghiệm thu và kiểm thử](#13-nghiệm-thu-và-kiểm-thử)
14. [Phân vai: phần nào học sinh sửa được](#14-phân-vai-phần-nào-học-sinh-sửa-được)
15. [Nguồn gốc mã và việc dùng AI](#15-nguồn-gốc-mã-và-việc-dùng-ai)
16. [Hướng mở rộng: mô hình hồi quy tuyến tính](#16-hướng-mở-rộng-mô-hình-hồi-quy-tuyến-tính)
17. [Lịch sử thay đổi](#17-lịch-sử-thay-đổi)

---

## 1. Mục tiêu, phạm vi, người dùng

### 1.1 Mục tiêu

App điện thoại cho phép người dân và người giám sát:

1. **Xem tình trạng ngập** tại các trạm cảm biến theo thời gian thực (mực nước, mức ngập, trạng thái kết nối).
2. **Xem bản đồ** trạm và vùng ảnh hưởng ngập. **Bản đồ là màn hình chính.**
3. **Xem lịch sử và dự báo nguy cơ** (kèm lượng mưa) của từng trạm.
4. **Theo dõi trạm** và nhận cảnh báo khi trạm vượt ngưỡng.
5. **Kiểm tra tuyến đường** có đi gần vùng ngập không.

App **không tự tính** mức ngập, ngưỡng, vùng ảnh hưởng hay dự báo. Tất cả do máy chủ cung cấp; app chỉ hiển thị đúng, rõ và an toàn (xem mục 2).

### 1.2 Người dùng

| Vai trò | Dùng app để | Ghi chú |
|---|---|---|
| Người dùng thông thường (`USER`) | Xem trạm, bản đồ, dự báo; theo dõi trạm; kiểm tra tuyến | Đối tượng chính |
| Người giám sát hiện trường | Tra cứu tình trạng trạm, lịch sử, vị trí | Dùng cùng chức năng với `USER` |
| Quản trị viên (`ADMIN`) | Đăng nhập và xem như người dùng thường | Chức năng quản trị **ở lại trên web**; app chỉ hiện vai trò |

### 1.3 Nền tảng

- Android và iOS qua **Expo Go** (Expo SDK 58, React Native 0.88, TypeScript, Expo Router). Cần Node 22.13+ / 24 / 26 (không dùng bản số lẻ).
- Bản web (`expo start --web`) chỉ là **bản thay thế để xem thử và kiểm tra giao diện**; bản đồ trên web là danh sách thay thế (`StationMap.web.tsx`), không phải bản đồ thật.
- Chưa có bản build cài đặt riêng (APK/IPA); chưa phát hành lên cửa hàng ứng dụng.

### 1.4 Ngoài phạm vi (phiên bản này)

Giao diện quản trị; xuất CSV; báo cáo ngập từ cộng đồng và ảnh hiện trường; heatmap; dự báo bằng AI; Push Notification từ máy chủ (máy chủ chưa hỗ trợ); theo dõi vị trí chạy nền; tìm kiếm địa điểm theo tên.

---

## 2. Quy tắc bắt buộc

Đây là các quy tắc an toàn lấy từ tài liệu yêu cầu (mục 2.2, FR-06, FR-14). Mọi thay đổi code **không được phá** các quy tắc này. Mỗi quy tắc ghi nơi thực hiện để kiểm tra.

| Mã | Quy tắc | Thực hiện ở |
|---|---|---|
| **R-01** | **Trạm mất kết nối không có nghĩa là khu vực an toàn.** Trạm có dữ liệu cũ (offline / chưa có dữ liệu) bị tô xám, ghi "dữ liệu cũ", **không vẽ vòng ngập**, không được tính vào "đang ngập". | `utils/isStationDataFresh.ts`, `constants/floodLevelStyles.ts` (`STALE_STATION_COLOR`), `components/map/StationMarker.tsx` |
| **R-02** | **Thiếu số đo thì hiện "Chưa có dữ liệu", không bao giờ thay bằng 0.** Giá trị thiếu được giữ là `null` từ lớp đổi dữ liệu trở đi. | `utils/toNumberOrNull.ts`, `utils/formatSensorValue.ts`, `api/mappers/*` |
| **R-03** | **Không chỉ dùng màu để báo mức.** Mỗi mức có thêm ký hiệu (● ▲ ◆ ■ ?) và nhãn chữ. | `constants/floodLevelStyles.ts`, `components/station/FloodLevelBadge.tsx` |
| **R-04** | **Chỉ số nguy cơ 0–100 không phải xác suất ngập.** Luôn ghi nguồn tính (mô hình quy tắc + mưa Open-Meteo) và thời điểm tính. Không gọi là "AI" hay "xác suất". | `components/forecast/ForecastSummaryCard.tsx`, `types/FloodForecast.ts` |
| **R-05** | **Gói realtime cũ hơn dữ liệu đang có thì bỏ qua**, không ghi đè. | `utils/applyRealtimeEvent.ts` |
| **R-06** | **Đổi trạm thì xóa ngay số của trạm cũ**, không hiện nhầm sang trạm mới. Phản hồi đến muộn của lần gọi cũ bị bỏ. | `hooks/useAutoRefresh.ts` |
| **R-07** | **Lỗi mạng không xóa dữ liệu đang hiện**: giữ số gần nhất kèm dòng "Không cập nhật được…". | `hooks/useAutoRefresh.ts`, `components/common/StaleDataWarning.tsx` |
| **R-08** | **Kiểm tra tuyến: không kết luận "an toàn" khi thiếu dữ liệu.** Nếu có trạm mất kết nối trong 430 m quanh tuyến thì ghi "Chưa đủ dữ liệu đánh giá". | `utils/findUnreliableStationsNearRoute.ts`, `components/map/RouteCheckResultView.tsx` |
| **R-09** | **Ngưỡng, mức ngập, bán kính vùng ảnh hưởng do máy chủ quyết định**; app không tự đặt (xem ngoại lệ ở mục 10, dòng "Thiếu ngưỡng"). | `api/mappers/toStation.ts`, `api/mappers/toFloodLevel.ts` |
| **R-10** | **Chỉ xin quyền khi người dùng bấm** (vị trí, thông báo). Từ chối quyền vẫn dùng được app. | `hooks/useCurrentLocation.ts`, `state/NotificationSettingsProvider.tsx` |
| **R-11** | **Không để bí mật trong app.** Mọi biến `EXPO_PUBLIC_*` bị nhúng vào app và ai cũng đọc được. | `.env.example`, `config/appConfig.ts` |
| **R-12** | **Thời gian hiển thị theo giờ Việt Nam** (Asia/Ho_Chi_Minh); dữ liệu từ máy chủ dùng ISO 8601. | `utils/toVietnamTime.ts`, `utils/format*.ts` |

Quy tắc về cách viết code (một file một việc, không `fetch` trực tiếp trong màn hình, không viết cứng màu...) nằm ở `README.md` mục 6.

---

## 3. Kiến trúc

```
Trạm cảm biến ──MQTT──▶ Máy chủ smartflood.vn ──REST API + Socket.IO──▶ App
(mực nước, nhiệt độ,     (lưu số đo, tính mức ngập,                      (bản đồ, cảnh báo,
 độ ẩm, ánh sáng)         dự báo, kiểm tra tuyến)                         dự báo, tuyến đường)
```

### 3.1 Các lớp trong `src/`

| Lớp | Thư mục | Vai trò | Quy tắc |
|---|---|---|---|
| Màn hình | `app/` | Mỗi file là một màn (Expo Router) | Không `fetch` trực tiếp, không viết cứng màu |
| Giao diện | `components/` | Mảnh giao diện, chia theo nhóm (`map`, `station`, `charts`, `forecast`, `alerts`, `auth`, `overview`, `profile`, `common`) | Mỗi file một component |
| Kho dữ liệu dùng chung | `state/` | `AuthProvider`, `StationsProvider`, `RealtimeProvider`, `FavoritesProvider`, `NotificationSettingsProvider`, bọc trong `AppProviders` theo thứ tự phụ thuộc: Đăng nhập → Cài đặt thông báo → Trạm theo dõi → Realtime → Danh sách trạm (kho nằm trong dùng được kho ngoài, không ngược lại) | Màn hình đọc qua hook `useAuth()`, `useStations()`... |
| Gọi máy chủ | `api/` | Mỗi file một API; `requestJson.ts` là **cổng duy nhất** ra mạng; `mappers/` đổi JSON máy chủ sang kiểu của app | Tên hàm bắt đầu bằng động từ; mapper bắt đầu bằng `to` |
| Hàm thuần | `utils/` | Mỗi file một hàm (lọc, sắp xếp, khoảng cách, định dạng) | Không phụ thuộc giao diện |
| Hook | `hooks/` | `useAutoRefresh` (tải + tự tải lại), `useCurrentLocation` | |
| Kiểu dữ liệu | `types/` | Một file một kiểu | |
| Hằng số | `constants/`, `config/` | Màu, nhãn mức ngập, khoảng lịch sử, chu kỳ tải lại | Đổi giá trị ở đây, không sửa code |
| Thông báo | `notifications/` | Quyền, hiện thông báo, mở trạm khi chạm thông báo | |
| Điều hướng | `navigation/` | Mở chi tiết trạm, mở trạm trên bản đồ | |
| Lưu trên máy | `storage/` | Cờ "đã xem giới thiệu" | |
| Dữ liệu mẫu | `demo/` | "Máy chủ giả" cho chế độ DEMO | |

### 3.2 Luồng dữ liệu chính

**Danh sách trạm** = tải từ `GET /api/stations/status` (mỗi 30 giây) **gộp** với gói realtime mới nhất của từng trạm (`applyRealtimeEvent`). Mọi màn hình (Bản đồ, Tổng quan, Trạm, Cảnh báo, Cá nhân) đọc cùng một danh sách này nên luôn thống nhất.

```
Socket.IO "flood_data"/"flood_alert"
  → api/realtime/connectRealtimeSocket.ts → api/mappers/toRealtimeFloodEvent.ts
  → state/RealtimeProvider.tsx   (lưu gói mới nhất; cảnh báo → dải đỏ + thông báo nếu đủ điều kiện)
  → state/StationsProvider.tsx   (gộp vào danh sách trạm)
  → màn hình đọc useStations()
```

Chi tiết trạm có thêm: số đo mới nhất (30 giây), dự báo (10 phút), lịch sử (theo khoảng chọn), đều qua `useAutoRefresh`.

### 3.3 Phiên đăng nhập

Máy chủ dùng **cookie phiên** `iot.sid` (hạn 7 ngày), giống web. `requestJson` gửi kèm cookie (`credentials: 'include'`) nên app **không có token để cất vào kho bảo mật**. Khi mở app, `AuthProvider` hỏi `GET /api/me` để khôi phục phiên. Máy chủ trả 401 ở bất kỳ API nào thì app tự chuyển về chưa đăng nhập (`api/sessionExpiredListener.ts`).

---

## 4. Mô hình dữ liệu

### 4.1 Mức ngập (`FloodLevel`)

Đúng 4 mức máy chủ dùng, cộng một mức "chưa biết" của app.

| Giá trị | Nhãn | Ký hiệu | Màu | Điều kiện (so với ngưỡng của trạm) |
|---|---|---|---|---|
| `normal` | An toàn | ● | `#10B981` | mực nước < 70% ngưỡng |
| `warning` | Cảnh báo | ▲ | `#F59E0B` | 70% ngưỡng ≤ mực nước < ngưỡng |
| `danger` | Nguy hiểm | ◆ | `#F43F5E` | ngưỡng ≤ mực nước < 130% ngưỡng |
| `critical` | Rất nguy hiểm | ■ | `#A855F7` | mực nước ≥ 130% ngưỡng |
| `unknown` | Chưa có dữ liệu | ? | `#94A3B8` | chưa đủ dữ liệu để xếp mức |

Điều kiện do **máy chủ** tính; app chỉ nhận và hiển thị.

### 4.2 Trạng thái kết nối (`ConnectionState`)

| Giá trị | Nhãn | Nghĩa (máy chủ tính) |
|---|---|---|
| `online` | Online | có dữ liệu trong 60 giây gần nhất |
| `slow` | Chậm dữ liệu | 60 giây – 5 phút chưa có dữ liệu |
| `offline` | Offline | quá 5 phút không có dữ liệu |
| `nodata` | Chưa có dữ liệu | trạm chưa từng gửi dữ liệu |

**Dữ liệu "còn mới"** (`isStationDataFresh`) = `online` hoặc `slow`. Mọi quy tắc R-01 dựa vào định nghĩa này.

### 4.3 Các kiểu chính

| Kiểu | Trường chính | Ghi chú |
|---|---|---|
| `Station` | `nodeId`, `name`, `latitude/longitude` (có thể `null`), `thresholdCm`, `waterLevelCm` (`null` nếu chưa có), `floodLevel`, `lastSeenAt`, `connectionState`, `floodRadiusM` | `floodRadiusM = 0` nghĩa là không vẽ vùng ngập |
| `SensorReading` | `nodeId`, `waterLevelCm`, `temperatureC`, `humidityPct`, `lightLux` (đều có thể `null`), `timestamp` | `null` = cảm biến không gửi, **không phải 0** |
| `FloodForecast` | `nodeId`, `method`, `generatedAt`, `currentWaterLevelCm`, `thresholdCm`, `latestSensorTimestamp`, `hours[]` | `hours[]` gồm `time`, `rainMm`, `rainProbability`, `rainNext3hMm`, `riskPercent`, `riskLabel` |
| `RealtimeFloodEvent` | `nodeId`, `stationName`, `waterLevelCm`, `thresholdCm`, `level`, `floodRadiusM`, `timestamp`, `receivedAt` | `receivedAt` là lúc điện thoại nhận; dùng để so "mới hơn" (R-05) |
| `RouteCheckResult` | `message`, `riskLevel`, `safeRouteFound`, `endpointBlocked`, `routeEngineOk`, `directRoute[]`, `suggestedRoute[]`, `floodPoints[]`, `directStats`, `suggestedStats` | Kết quả `POST /api/route/check` |
| `AlertLogEntry` | `id`, `nodeId`, `stationName`, `level`, `waterLevelCm` (tại lúc gửi), `thresholdCm`, `sentAt`, `channel`, `delivered` | Là nhật ký **email đã gửi**, không phải sự kiện ngập |
| `FavoriteStation` | `nodeId`, `emailEnabled` | Lưu theo tài khoản trên máy chủ |
| `EmailAlertStatus` | `configured`, `status`, `recipient`, `favoriteCount`, `cooldownMinutes` | |
| `UserProfile` | `userId`, `username`, `email`, `role` | `role` là `USER` hoặc `ADMIN` |

### 4.4 Chỉ số nguy cơ dự báo

- Máy chủ tính bằng **mô hình quy tắc** `rule_based_sensor_weather_v1`: mực nước hiện tại 55% + mưa 3 giờ tới 35% + xác suất mưa 10%; mực nước đã ≥ ngưỡng thì chỉ số = 100.
- Màu thanh nguy cơ (`utils/getRiskColor.ts`): ≥ 60 đỏ, ≥ 30 vàng, còn lại xanh.
- Nhãn do máy chủ đặt: AN TOÀN / THEO DÕI / NGUY CƠ CAO / NGUY HIỂM.
- Đây **không phải mô hình học máy** và **không phải xác suất ngập đã hiệu chuẩn** (xem R-04, và mục 16).

---

## 5. Màn hình và điều hướng

Tab dưới đáy (cả nhóm tab yêu cầu đăng nhập qua `RequireLogin`):

| Tab | Route | File | Mục đích |
|---|---|---|---|
| ◉ **Bản đồ** (tab đầu, màn mở đầu) | `/` | `app/(tabs)/index.tsx` | Bản đồ trạm, lọc, thẻ thông tin, vị trí, kiểm tra tuyến |
| ⌂ Tổng quan | `/overview` | `app/(tabs)/overview.tsx` | Tóm tắt hệ thống + một trạm được chọn |
| ! Cảnh báo | `/alerts` | `app/(tabs)/alerts.tsx` | Trạm đang cảnh báo, cảnh báo vừa nhận, lịch sử email |
| ≡ Trạm | `/stations` | `app/(tabs)/stations.tsx` | Danh sách, tìm, lọc, sắp xếp |
| ☺ Cá nhân | `/profile` | `app/(tabs)/profile.tsx` | Tài khoản, thông báo, email, trạm theo dõi, đăng xuất |

Màn xếp chồng (Stack):

| Màn | Route | File |
|---|---|---|
| Giới thiệu (chỉ lần đầu) | `/onboarding` | `app/onboarding.tsx` |
| Đăng nhập | `/login` | `app/login.tsx` |
| Đăng ký 2 bước + OTP | `/register` | `app/register.tsx` |
| Chi tiết trạm | `/station/[nodeId]` | `app/station/[nodeId].tsx` |

**Khác tài liệu yêu cầu một chỗ:** tài liệu xếp Home | Map | Alerts | Stations | Profile. App đưa **Bản đồ lên đầu** và làm màn mở đầu vì đó là phần nổi bật nhất của đề tài; "Home" đặt tên là "Tổng quan".

**Điều hướng liên màn:** `navigation/openStationDetail.ts` (mở chi tiết trạm từ mọi nơi, kể cả từ thông báo), `navigation/openStationOnMap.ts` (bay tới trạm trên bản đồ). Màn cần đăng nhập mà chưa đăng nhập → chuyển sang `/login` kèm `next`, đăng nhập xong quay lại đúng chỗ.

**Dải cảnh báo đỏ** (`components/alerts/RealtimeAlertBanner.tsx`) nằm trên cùng mọi màn khi có cảnh báo realtime.

---

## 6. Đặc tả chức năng

Ưu tiên (P0/P1) lấy **đúng theo tài liệu yêu cầu**. Trạng thái: ✅ đã làm · 🟡 làm một phần · ⬜ chưa làm.

### FR-01 Giới thiệu lần đầu (P1) ✅

- **Hành vi:** logo + giới thiệu ngắn 3 chức năng (theo dõi ngập, nhận cảnh báo, kiểm tra khu vực/tuyến đường). Có nút **Bỏ qua**. Chỉ tự hiện ở lần mở đầu tiên (cờ lưu trên máy).
- **Nghiệm thu:** hoàn tất hoặc bỏ qua thì vào đăng nhập / màn chính theo trạng thái phiên; mở lại app không hiện lại.
- **File:** `app/onboarding.tsx`, `storage/onboardingStorage.ts`.

### FR-02 Đăng nhập, đăng ký, phiên (P0) ✅ (trừ quên mật khẩu)

- **Hành vi:**
  - Đăng nhập bằng email + mật khẩu.
  - Đăng ký 2 bước: (1) tên, email, mật khẩu (**≥ 8 ký tự**, quy định của máy chủ) → máy chủ gửi OTP 6 số về email; (2) nhập đủ 6 số. Mã hết hạn sau **10 phút**; nút "Gửi lại mã" chờ **60 giây** (máy chủ chỉ cho gửi 3 lần mỗi phút).
  - Mở app: khôi phục phiên bằng `GET /api/me`. Hết phiên (401) → tự về đăng nhập.
  - Đăng xuất: hủy phiên trên máy chủ; mất mạng vẫn cho đăng xuất trên máy.
- **Nghiệm thu:** đăng nhập/đăng ký hợp lệ thành công; mã sai, mã hết hạn, mật khẩu ngắn có thông báo tiếng Việt rõ; sau đăng xuất không còn xem được dữ liệu cần đăng nhập.
- **Chưa làm:** ⬜ quên mật khẩu, đổi mật khẩu (P1; **máy chủ chưa có API**).
- **File:** `app/login.tsx`, `app/register.tsx`, `components/auth/*`, `state/AuthProvider.tsx`, `api/auth/*`.

### FR-03 Tổng quan và chọn trạm (P0) ✅

- **Hành vi:** chọn một trạm → hiện tên, mực nước (cm), ngưỡng, mức ngập, kết nối, thời điểm cập nhật, chỉ số nguy cơ, mưa 3 giờ tới; nhiệt độ, độ ẩm, ánh sáng ở thẻ phụ. Trạm mặc định: trạm đã chọn lần trước → trạm đầu tiên đang theo dõi → trạm đầu tiên. Nhớ trạm đã chọn khi mở lại app. Kéo xuống để tải lại.
- **Nghiệm thu:** đổi trạm thì **mọi thẻ đổi theo**, không hiện nhầm số trạm trước (R-06).
- **File:** `app/(tabs)/overview.tsx`, `components/overview/SystemSummaryCard.tsx`, `components/station/*`.

### FR-04 Bản đồ trạm và vùng ảnh hưởng (P0) ✅

- **Hành vi:**
  - Mỗi trạm là một **nhãn màu** có ký hiệu và mực nước; vòng tròn bán kính `floodRadiusM` đánh dấu vùng ảnh hưởng (chỉ vẽ khi dữ liệu còn mới và bán kính > 0).
  - Có **chú giải** và **bộ lọc**: Tất cả / Đang ngập / Đang theo dõi / Mất kết nối (kèm số lượng).
  - Chạm trạm → thẻ thông tin ở đáy (tên, mực nước, mức, cập nhật, bán kính; nút Chi tiết, Theo dõi).
  - Tự thu phóng để thấy hết trạm lần đầu; mở từ màn khác thì bay tới đúng trạm.
  - Hiện trạng thái realtime (đang nhận / kết nối lại).
  - Trạm thiếu tọa độ **không đặt lên bản đồ** (không dùng tọa độ mặc định) nhưng vẫn có trong danh sách.
- **Nghiệm thu:** nhãn, thẻ thông tin và chi tiết cùng trạm cho **cùng số liệu**; chạm chọn trạm hoạt động trên điện thoại.
- **Lưu ý:** bán kính ảnh hưởng là vùng đánh giá do hệ thống cấu hình, **không** phải ranh giới ngập đo đạc chính xác.
- **File:** `app/(tabs)/index.tsx`, `components/map/*`, `utils/filterStations.ts`.

### FR-05 Danh sách trạm (P0 / P1) ✅

- **Hành vi:** mỗi dòng có tên, mực nước, kết nối, mức ngập, theo dõi. **Tìm** theo tên hoặc mã trạm (gõ không dấu vẫn được: "quan 1" ra "Quận 1"). **Lọc** như bản đồ. **Sắp xếp**: Tên A→Z, Mực nước cao trước, Cập nhật mới nhất, Gần tôi nhất (cần vị trí). Khi không có kết quả: có nút "Xóa bộ lọc".
- **Quy tắc xếp "Mực nước cao trước":** trạm có số đo mới trước, trạm mất kết nối sau (số của nó là số cũ), chưa có số đo cuối cùng.
- **Nghiệm thu:** chạm một dòng mở đúng chi tiết; tìm/lọc có trạng thái rỗng và xóa được bộ lọc.
- **File:** `app/(tabs)/stations.tsx`, `utils/searchStations.ts`, `filterStations.ts`, `sortStations.ts`.

### FR-06 Chi tiết trạm và realtime (P0) ✅

- **Hành vi:** tên/mã, tọa độ, kết nối, mực nước, ngưỡng, mức ngập, vùng ảnh hưởng, thời điểm cập nhật; thông số phụ (thiếu → "Chưa có dữ liệu"). Dòng trạng thái realtime. Realtime qua Socket.IO, tự kết nối lại; **khi kết nối lại sau một lúc mất, tải lại toàn bộ danh sách trạm ngay** (lấy snapshot, không chỉ chờ gói tiếp theo). Có gói realtime mới của trạm đang xem thì tải lại thông số phụ.
- **Nghiệm thu:** sự kiện mới cập nhật đúng trạm; sự kiện cũ không ghi đè (R-05); offline và dữ liệu cũ thể hiện rõ (R-01).
- **File:** `app/station/[nodeId].tsx`, `state/RealtimeProvider.tsx`, `state/StationsProvider.tsx`, `utils/applyRealtimeEvent.ts`.

### FR-07 Biểu đồ lịch sử (P0) ✅

- **Hành vi:** chọn **1 giờ / 24 giờ / 7 ngày**; chọn thông số **Mực nước** (mặc định) / Nhiệt độ / Độ ẩm / Ánh sáng, mỗi thông số một biểu đồ riêng với đơn vị riêng. Biểu đồ mực nước vẽ **đường ngưỡng nét đứt**. Chạm vào biểu đồ → hiện thời gian, giá trị, đơn vị của điểm gần nhất. Trục thời gian theo đúng thời điểm đo.
- **Không nối đường qua chỗ thiếu dữ liệu:** hai điểm liền nhau cách nhau quá **3 lần khoảng đo thường gặp (trung vị) và hơn 15 phút** thì ngắt đường (`utils/splitSeriesAtGaps.ts`).
- **Cách lấy dữ liệu:** xin tối đa 2000 lần đo rồi **app tự sắp xếp theo thời gian** (vì máy chủ cắt bớt trước khi sắp xếp, xem mục 12.2).
- **Nghiệm thu:** bộ lọc trả đúng khoảng và đúng trạm; giá trị khi chạm khớp dữ liệu API; đọc được trên màn hình nhỏ.
- **Chưa làm:** ⬜ tự chọn khoảng thời gian (P1), ⬜ xuất CSV (P2).
- **File:** `components/station/SensorHistoryCard.tsx`, `components/charts/HistoryLineChart.tsx`, `constants/historyRanges.ts`, `constants/sensorMetrics.ts`, `utils/toChartPoints.ts`.

### FR-08 Dự báo nguy cơ và mưa (P0) ✅

- **Hành vi:** hiện chỉ số nguy cơ giờ tới (0–100) và nhãn, mưa 3 giờ tới, mực nước dùng để tính, ngưỡng; màn Chi tiết có **biểu đồ cột theo giờ** (12 giờ). Ghi rõ nguồn (mực nước trạm + mưa Open-Meteo) và giờ tính; ghi rõ đây là chỉ số của mô hình quy tắc, **không phải xác suất ngập** (R-04).
- **Trạm mất kết nối:** hiện dòng đỏ "dự báo tính từ số đo cũ lúc …, chỉ để tham khảo".
- **Trạm chưa từng có số đo mực nước:** **không hiện chỉ số nguy cơ** (máy chủ đang tạm tính như 0 cm), chỉ hiện mưa.
- **Lỗi dự báo:** hiện thông báo lỗi; mực nước hiện tại vẫn hiện bình thường.
- **Chu kỳ:** tải lại mỗi 10 phút (máy chủ lưu đệm 10 phút).
- **Nghiệm thu:** app hiển thị đúng giá trị máy chủ; **không tự tính lại mô hình**; không trình bày dự báo cũ như kết quả mới.
- **File:** `components/forecast/ForecastSummaryCard.tsx`, `components/charts/ForecastRiskBars.tsx`, `api/forecast/getFloodForecast.ts`.

### FR-09 Theo dõi / bỏ theo dõi trạm (P0) ✅

- **Hành vi:** nút Theo dõi ở thẻ bản đồ, chi tiết, tổng quan; **lưu theo tài khoản trên máy chủ** (đăng nhập máy khác vẫn thấy; máy chủ dùng danh sách này để gửi email cảnh báo). Mặc định bật email cho trạm vừa theo dõi. Báo thành công/thất bại. Đổi tài khoản hoặc đăng xuất thì xóa danh sách của tài khoản cũ khỏi bộ nhớ.
- **Nghiệm thu:** mở lại app vẫn còn; bỏ theo dõi thì trạm không còn trong danh sách và máy chủ ngừng gửi cảnh báo cho trạm đó.
- **File:** `components/station/FollowButton.tsx`, `state/FavoritesProvider.tsx`, `api/favorites/*`.

### FR-10 Thông báo và mở đúng trạm (P0) 🟡

- **Đã có:** khi nhận cảnh báo realtime (`flood_alert`): hiện **dải đỏ trong app**; nếu là trạm **đang theo dõi** và người dùng đã **bật thông báo trên điện thoại** thì hiện thêm thông báo hệ điều hành (trạm, mức, mực nước/ngưỡng, giờ). **Chạm thông báo mở đúng trạm**, cả khi app đang chạy lẫn khi mở app từ thông báo; chưa đăng nhập thì đăng nhập xong mở tiếp.
- **Chưa có:** ⬜ **Push từ máy chủ** (token thiết bị, nhận khi app tắt hẳn). Máy chủ chưa có Push; Expo Go cũng không hỗ trợ Push từ máy chủ. Hiện chỉ báo được khi app đang mở hoặc vừa chạy nền; app tắt hẳn thì người dùng vẫn nhận **email** cảnh báo (nếu bật cho trạm đó).
- **Nghiệm thu (phần đã làm):** chạm thông báo mở đúng trạm; từ chối quyền không chặn dùng bản đồ và xem cảnh báo trong app.
- **File:** `notifications/*`, `components/alerts/RealtimeAlertBanner.tsx`, `state/RealtimeProvider.tsx`.

### FR-11 Trung tâm cảnh báo (P0) ✅

- **Hành vi:** màn Cảnh báo có 3 phần:
  1. **Đang cảnh báo:** các trạm có dữ liệu mới và ở mức Cảnh báo trở lên, xếp theo tỉ lệ mực nước/ngưỡng giảm dần. Ghi chú số trạm mất kết nối bị loại ra và **không có nghĩa là an toàn**.
  2. **Mới nhận trong lần mở app này:** cảnh báo realtime (tối đa 50).
  3. **Lịch sử email cảnh báo:** `GET /api/alerts` (50 dòng, tải lại mỗi 60 giây). Mực nước ghi là **giá trị lúc gửi**, không phải hiện tại.
- Chạm dòng nào cũng mở chi tiết trạm; kéo xuống để tải lại.
- **Nghiệm thu:** lịch sử vẫn có khi không nhận được thông báo; không dùng mực nước hiện tại thay giá trị lúc phát cảnh báo.
- **Chưa làm:** ⬜ lọc theo thời gian/trạm/mức (P1); ⬜ trạng thái "đã kết thúc" (máy chủ không lưu).
- **File:** `app/(tabs)/alerts.tsx`, `components/alerts/*`.

### FR-12 Cài đặt thông báo và email (P0 / P1) 🟡

- **Hành vi:** công tắc **Thông báo trên điện thoại** (mặc định **tắt**; bật thì mới xin quyền hệ điều hành) và dòng trạng thái quyền. **Bật/tắt email cảnh báo cho từng trạm đang theo dõi** (lưu theo tài khoản). Hiện tình trạng dịch vụ email của máy chủ (cấu hình/sẵn sàng/lỗi, thời gian chờ giữa hai email).
- **Lưu ý:** công tắc thông báo trên điện thoại **lưu trên máy**, không lưu theo tài khoản, vì máy chủ chưa có API cho việc này.
- **Chưa làm:** ⬜ chọn cấp độ muốn nhận (P1).
- **File:** `app/(tabs)/profile.tsx`, `state/NotificationSettingsProvider.tsx`, `notifications/useNotificationPermissionStatus.ts`, `api/email/getEmailAlertStatus.ts`.

### FR-13 Vị trí hiện tại và trạm gần tôi (P1) ✅

- **Hành vi:** nút ◎ trên bản đồ: xin quyền vị trí **lúc bấm**, đưa bản đồ về vị trí người dùng, tìm **trạm gần nhất** và khoảng cách. Sắp xếp "Gần tôi nhất" ở danh sách trạm cũng xin quyền lúc chọn. Không theo dõi vị trí nền.
- **Nghiệm thu:** có quyền → bản đồ về đúng vị trí; từ chối hoặc GPS lỗi → báo rõ và vẫn chọn trạm, chọn điểm thủ công được (R-10).
- **File:** `hooks/useCurrentLocation.ts`, `utils/findNearestStation.ts`, `utils/distanceInMeters.ts`.

### FR-14 Kiểm tra tuyến đường (P1) ✅

- **Hành vi:** nút ⇄ mở khung ở đáy bản đồ.
  1. Chọn **điểm đi A**: chạm giữ trên bản đồ, hoặc "Dùng vị trí của tôi".
  2. Chọn **điểm đến B**: chạm giữ trên bản đồ.
  3. Bấm "Kiểm tra tuyến" → `POST /api/route/check`. Máy chủ lấy tuyến từ dịch vụ chỉ đường OSRM, đo tuyến có đi gần trạm đang ngập không, và nếu có thể thì gợi ý tuyến tránh.
  - App vẽ tuyến chính (đỏ nét đứt khi có nguy cơ) và tuyến tránh (xanh lá) nếu máy chủ trả; liệt kê các trạm ngập gần tuyến (mức, mực nước, khoảng cách); có "Chọn lại" và đóng khung.
- **Quy tắc an toàn (R-08):** máy chủ nói tuyến an toàn nhưng gần tuyến (≤ 430 m) có trạm mất kết nối → hiện **"Chưa đủ dữ liệu đánh giá"**, không kết luận an toàn. Trạm gần tuyến có dữ liệu cũ được ghi "(dữ liệu cũ)".
- **Ghi chú luôn hiện:** chỉ xét các trạm đang có trong hệ thống; điểm ngập ngoài mạng lưới trạm không được phát hiện. Nếu dịch vụ chỉ đường lỗi, máy chủ dùng đường thẳng và app báo như vậy.
- **Nghiệm thu:** tuyến thử cắt vùng ảnh hưởng thì cảnh báo đúng trạm; thiếu dữ liệu thì ghi "Chưa đủ dữ liệu đánh giá".
- **Chưa làm:** ⬜ tìm địa điểm theo tên (đang chọn bằng chạm giữ).
- **File:** `components/map/RouteCheckPanel.tsx`, `RouteCheckResultView.tsx`, `RouteLines.tsx`, `api/route/checkRouteFloodRisk.ts`, `utils/findUnreliableStationsNearRoute.ts`, `utils/distanceToRouteInMeters.ts`.

### FR-15 Cá nhân và quyền (P0 / P1) ✅

- **Hành vi:** hiện tên, email, vai trò (ADMIN có ghi chú "chức năng quản trị dùng trên web"); danh sách trạm đang theo dõi (chạm mở trạm); cài đặt thông báo/email; thông tin kỹ thuật (địa chỉ máy chủ, chế độ DEMO); đăng xuất (có hỏi xác nhận trên điện thoại).
- **Quyền:** **máy chủ kiểm tra quyền ở mỗi API**; app chỉ hiển thị vai trò. Sửa vai trò phía app không cấp thêm quyền.
- **Chưa làm:** ⬜ sửa tên, ảnh đại diện, đổi mật khẩu (máy chủ chưa có API).
- **File:** `app/(tabs)/profile.tsx`, `components/profile/FollowedStationRow.tsx`, `components/common/RequireLogin.tsx`.

### Tổng hợp trạng thái

| | FR-01 | 02 | 03 | 04 | 05 | 06 | 07 | 08 | 09 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Ưu tiên | P1 | P0 | P0 | P0 | P0/P1 | P0 | P0 | P0 | P0 | P0 | P0 | P0/P1 | P1 | P1 | P0/P1 |
| Trạng thái | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | 🟡 | ✅ | ✅ | ✅ |

---

## 7. Giao tiếp với máy chủ

Mọi lời gọi đi qua `api/requestJson.ts`: gửi cookie phiên, giới hạn thời gian chờ 15 giây, đổi lỗi thành `ApiError` có câu tiếng Việt. Máy chủ báo lỗi dạng `{ success: false, message }`.

### 7.1 REST

| Chức năng | Method + đường dẫn | Gửi | App đọc | File |
|---|---|---|---|---|
| Đăng nhập | `POST /api/login` | `{ email, password }` | cookie phiên | `api/auth/loginUser.ts` |
| Đăng xuất | `POST /api/logout` | | | `api/auth/logoutUser.ts` |
| Tài khoản hiện tại | `GET /api/me` | | `userId`, `username`, `email`, `role` | `api/auth/getCurrentUser.ts` |
| Đăng ký bước 1 | `POST /api/register-step-1` | `{ username, email, password }` | | `api/auth/sendRegisterOtp.ts` |
| Đăng ký bước 2 | `POST /api/register-verify` | `{ email, otp }` | | `api/auth/verifyRegisterOtp.ts` |
| Danh sách trạm + tình trạng | `GET /api/stations/status` | | `stations[]`: `node_id`, `name`, `lat`, `lng`, `threshold_cm`, `current_water_level_cm`, `current_status`, `last_seen_at`, `connection_state`, `flood_radius_m` | `api/stations/getStationList.ts`, `api/mappers/toStation.ts` |
| Số đo mới nhất | `GET /api/sensor/latest/:node_id` | | một lần đo (`{}` nếu chưa có) | `api/sensor/getLatestReading.ts` |
| Lịch sử | `GET /api/sensor/history/:node_id?hours=&limit=2000` | | `data[]` | `api/sensor/getSensorHistory.ts` |
| Dự báo | `GET /api/stations/forecast/:node_id?hours=12` | | chuỗi giờ, mưa, chỉ số nguy cơ | `api/forecast/getFloodForecast.ts` |
| Kiểm tra tuyến | `POST /api/route/check` | `{ start:{lat,lng}, end:{lat,lng} }` | tuyến, trạm ngập gần tuyến, kết luận | `api/route/checkRouteFloodRisk.ts` |
| Danh sách theo dõi | `GET /api/favorites` | | `favorites[]`: `node_id`, `email_enabled` | `api/favorites/getFavoriteStations.ts` |
| Theo dõi | `POST /api/favorites/:node_id` | `{ email_enabled: true }` | | `api/favorites/followStation.ts` |
| Bỏ theo dõi | `DELETE /api/favorites/:node_id` | | | `api/favorites/unfollowStation.ts` |
| Bật/tắt email trạm | `PATCH /api/favorites/:node_id/channels` | `{ email_enabled }` | | `api/favorites/setEmailAlertEnabled.ts` |
| Nhật ký cảnh báo email | `GET /api/alerts?limit=50` | | `alerts[]` | `api/alerts/getAlertLog.ts` |
| Tình trạng email | `GET /api/email/status` | | `configured`, `status`, `recipient`, `favorite_count`, `cooldown_minutes` | `api/email/getEmailAlertStatus.ts` |

### 7.2 Realtime (Socket.IO)

- Kết nối tới `API_BASE_URL`, `transports: ['websocket']`, tự kết nối lại (`api/realtime/connectRealtimeSocket.ts`).
- Sự kiện `flood_data`: có số đo mới của một trạm. Sự kiện `flood_alert`: trạm vượt ngưỡng nguy hiểm.
- **Từ gói realtime, app chỉ lấy mực nước và trạng thái** (không lấy nhiệt độ, độ ẩm, ánh sáng, vì máy chủ điền 0 khi thiếu). Thông số phụ lấy từ `GET /api/sensor/latest` (`api/mappers/toRealtimeFloodEvent.ts`).
- Chỉ kết nối khi đã đăng nhập; đăng xuất thì ngắt và xóa dữ liệu realtime.

### 7.3 Phía máy chủ còn thiếu so với tài liệu yêu cầu

Push + đăng ký token thiết bị; làm mới phiên (refresh token); quên/đổi mật khẩu; cập nhật hồ sơ; cảnh báo "đã hết ngập"; `valid_until` của dự báo; cài đặt thông báo theo tài khoản. Chi tiết 38 vấn đề của máy chủ ở `SmartFlood_Danh_sach_van_de.docx`.

---

## 8. Cấu hình và hằng số

### 8.1 Biến môi trường (file `.env.local`, mẫu ở `.env.example`)

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | `https://smartflood.vn` | Địa chỉ máy chủ, không có `/` ở cuối |
| `EXPO_PUBLIC_DEMO_MODE` | `false` | `true` = dùng dữ liệu mẫu, không cần mạng và tài khoản |

Đổi biến xong phải chạy lại `npx expo start`. Không để mật khẩu hay khóa bí mật ở đây (R-11).

### 8.2 Hằng số trong `src/config/appConfig.ts`

| Hằng số | Giá trị | Ý nghĩa |
|---|---|---|
| `STATION_REFRESH_MS` | 30 giây | Tải lại danh sách trạm |
| `READING_REFRESH_MS` | 30 giây | Tải lại số đo mới nhất ở chi tiết/tổng quan |
| `FORECAST_REFRESH_MS` | 10 phút | Tải lại dự báo |
| `REQUEST_TIMEOUT_MS` | 15 giây | Quá thời gian này thì báo lỗi |
| `FORECAST_HOURS` | 12 | Số giờ dự báo lấy về (máy chủ cho phép 1–24) |
| `ROUTE_UNRELIABLE_STATION_RANGE_M` | 430 m | = bán kính ảnh hưởng lớn nhất (350 m) + vùng đệm an toàn của máy chủ (80 m) |
| `OTP_RESEND_WAIT_SECONDS` | 60 | Chờ trước khi cho "Gửi lại mã" |
| `OTP_VALID_MINUTES` | 10 | Hạn của mã OTP (hiện cho người dùng biết) |
| `DEFAULT_MAP_CENTER` | 10.7769, 106.7009 | Tâm bản đồ khi chưa có trạm (trung tâm TP.HCM) |

### 8.3 Hằng số giao diện (`src/constants/`)

`floodLevelStyles.ts` (nhãn, màu, ký hiệu từng mức), `connectionStateStyles.ts` (nhãn, màu kết nối), `historyRanges.ts` (1h / 24h / 7d), `sensorMetrics.ts` (4 thông số + đơn vị), `appColors.ts` (màu chủ đạo).

### 8.4 Dữ liệu lưu trên máy (AsyncStorage)

| Khóa | Nội dung |
|---|---|
| `smartflood.selectedNodeId` | Trạm đang chọn ở Bản đồ/Tổng quan |
| `smartflood.phoneAlertsEnabled` | Có hiện thông báo trên điện thoại không (mặc định `false`) |
| `smartflood.onboardingSeen` | Đã xem màn giới thiệu chưa (`storage/onboardingStorage.ts`) |

App **không lưu** dữ liệu trạm khi tắt hẳn (xem NFR-03, mục 9).

---

## 9. Yêu cầu phi chức năng

| Mã | Yêu cầu | Trạng thái | Cách đáp ứng / còn thiếu |
|---|---|---|---|
| NFR-01 | Bảo mật | 🟡 | HTTPS; quyền do máy chủ kiểm tra. Máy chủ dùng cookie phiên nên **không có token để cất vào kho bảo mật**; cookie do hệ điều hành giữ. Không có khóa bí mật trong app. |
| NFR-02 | Cập nhật ≤ 5 giây từ khi máy chủ phát | ✅ (theo thiết kế) | Socket.IO, tự kết nối lại. **Chưa đo độ trễ thực tế.** |
| NFR-03 | Mất kết nối: giữ dữ liệu cũ, tự kết nối lại | 🟡 | Lỗi mạng giữ số gần nhất kèm dòng báo lỗi; realtime tự nối lại và tải lại snapshot. **Chưa lưu dữ liệu khi tắt hẳn app.** |
| NFR-04 | Hiệu năng: tải ≤ 3 giây sau phản hồi API | ⬜ chưa đo | Chưa có số liệu đo (tài liệu yêu cầu cũng nói cần chốt cấu hình máy và số trạm trước). |
| NFR-05 | Dễ dùng | ✅ | Tiếng Việt; đơn vị rõ; màu luôn kèm ký hiệu và chữ (R-03). Chưa kiểm tra riêng với chữ phóng to và trình đọc màn hình. |
| NFR-06 | Quyền riêng tư | ✅ | Chỉ xin quyền vị trí/thông báo khi người dùng bấm; không dùng vị trí nền (R-10). |

---

## 10. Trường hợp biên và xử lý lỗi

| Tình huống | App làm gì |
|---|---|
| Máy chủ không trả lời trong 15 giây | "Máy chủ phản hồi quá lâu. Kiểm tra mạng rồi thử lại." |
| Không có mạng | "Không kết nối được máy chủ. Kiểm tra mạng." |
| Lỗi mạng khi đang xem dữ liệu | Giữ số gần nhất, thêm dòng "Không cập nhật được: … Đang hiện dữ liệu gần nhất." (R-07) |
| Máy chủ trả 401 | Về trạng thái chưa đăng nhập, chuyển sang đăng nhập, xong quay lại màn đang định mở |
| Phản hồi của lần gọi cũ đến muộn | Bỏ qua (R-06) |
| Trạm offline / chưa có dữ liệu | Tô xám, ghi "dữ liệu cũ", không vẽ vòng ngập, không tính vào "đang ngập" (R-01) |
| Trạm chưa từng có số đo mực nước | Hiện "Chưa có dữ liệu"; không hiện chỉ số nguy cơ |
| Cảm biến thiếu nhiệt độ/độ ẩm/ánh sáng | "Chưa có dữ liệu", không phải 0 (R-02) |
| Trạm thiếu tọa độ | Không đặt marker; vẫn có trong danh sách |
| Gói realtime cũ hơn dữ liệu đang có | Bỏ qua (R-05) |
| Realtime mất rồi nối lại | Tải lại toàn bộ danh sách trạm ngay |
| Lịch sử có khoảng trống | Ngắt đường vẽ ở chỗ trống (FR-07) |
| Dự báo lỗi | Báo lỗi ở thẻ dự báo; mực nước hiện tại vẫn hiện |
| Từ chối quyền vị trí | Báo rõ, vẫn dùng bản đồ; chọn điểm thủ công được |
| Từ chối quyền thông báo | Công tắc về tắt, hướng dẫn mở trong Cài đặt điện thoại; vẫn thấy dải đỏ trong app |
| Dịch vụ chỉ đường (OSRM) lỗi | Máy chủ dùng đường thẳng; app ghi chú như vậy |
| OTP sai / hết hạn / gửi quá nhanh | Hiện đúng câu máy chủ trả |
| **Máy chủ không gửi `threshold_cm`** | ⚠ `api/mappers/toStation.ts` đang **đặt ngưỡng mặc định 30 cm**. Đây là chỗ duy nhất app tự đặt ngưỡng, lệch nhẹ với R-09; nên đổi thành "không rõ ngưỡng" nếu máy chủ có thể thiếu trường này. |

---

## 11. Chế độ DEMO

Bật bằng `EXPO_PUBLIC_DEMO_MODE=true` trong `.env.local`. Dùng khi thuyết trình ở nơi mạng yếu hoặc để các em tập mà không cần tài khoản thật.

- `requestJson` **không gọi mạng**; `demo/getDemoResponse.ts` trả JSON đúng định dạng máy chủ cho cùng các đường dẫn API. Độ trễ giả 250 ms.
- 6 trạm mẫu: Q.1 (rất nguy hiểm), Q.7 (nguy hiểm; sau 15 giây phát cảnh báo để trình diễn dải đỏ và thông báo), Q.3 (cảnh báo), Bình Thạnh (an toàn), Q.4 (mất kết nối 3 ngày), một trạm mới chưa có dữ liệu.
- Realtime giả (`demo/startDemoRealtime.ts`): mỗi 10 giây trạm đầu tiên gửi số đo mới.
- Dải vàng "CHẾ ĐỘ DEMO" hiện ở màn Bản đồ, Tổng quan và Đăng nhập để không nhầm với dữ liệu thật; màn Cá nhân ghi "không dùng (chế độ demo)" ở dòng máy chủ. Theo dõi trạm trong DEMO chỉ lưu tạm trong bộ nhớ.
- Muốn DEMO chạy thêm một API mới: thêm nhánh trong `demo/getDemoResponse.ts`.
- **Lưu ý:** trên iPhone, Expo Go vẫn bắt đăng nhập tài khoản Expo ở cả Expo CLI và Expo Go; chưa kiểm tra bước này có chạy khi không có Internet không. Nên có sẵn máy Android dự phòng.

---

## 12. Giới hạn đã biết và việc chưa làm

### 12.1 App chưa làm

| Việc | Ưu tiên | Lý do |
|---|---|---|
| Quên / đổi mật khẩu; sửa hồ sơ | P1 | Máy chủ chưa có API |
| Push từ máy chủ | P0 | Máy chủ chưa có Push; Expo Go không hỗ trợ |
| Chọn cấp độ cảnh báo muốn nhận | P1 | Máy chủ chưa hỗ trợ |
| Lọc lịch sử cảnh báo; trạng thái "đã kết thúc" | P1 | Máy chủ không lưu |
| Tự chọn khoảng thời gian lịch sử | P1 | Chưa làm |
| Tìm địa điểm theo tên khi kiểm tra tuyến | P1 | Chưa làm |
| Lưu dữ liệu khi tắt hẳn app (cache) | NFR-03 | Chưa làm |
| Xuất CSV, báo cáo cộng đồng, heatmap, admin | P2 | Ngoài phạm vi |

### 12.2 Lỗi của máy chủ và cách app xử lý

| Máy chủ | App xử lý |
|---|---|
| Trạm offline vẫn giữ mức ngập cũ (vd. "Nguy hiểm" từ 3 ngày trước) | Tô xám, không vẽ vòng, không tính vào đang ngập (R-01) |
| API lịch sử cắt `limit` **trước** khi sắp xếp, có thể mất số đo mới | Xin 2000 điểm rồi tự sắp xếp |
| Gói realtime điền 0 khi thiếu nhiệt độ, độ ẩm, ánh sáng | Chỉ lấy mực nước và trạng thái từ gói realtime |
| Dự báo tính mực nước = 0 khi trạm chưa có số đo | Không hiện chỉ số nguy cơ cho trạm đó |
| "Lịch sử cảnh báo" chỉ là nhật ký email đã gửi | Ghi rõ như vậy trong màn Cảnh báo |
| Kiểm tra tuyến dùng trạng thái cũ của trạm offline | Ghi "(dữ liệu cũ)"; có trạm offline gần tuyến thì báo "Chưa đủ dữ liệu đánh giá" |
| Mọi dữ liệu đều yêu cầu đăng nhập | Bắt đăng nhập trước khi vào các tab |
| "Dự báo" là công thức quy tắc, không phải mô hình học máy | Gọi đúng tên "chỉ số nguy cơ của mô hình quy tắc" (R-04) |

Khi máy chủ sửa xong một mục thì chỉ sửa đúng file đã ghi; các phần khác không phải đổi.

### 12.3 Chưa kiểm chứng

- Chưa chạy thử trên **Android/Samsung thật**. Đã chạy trên iPhone thật (Expo Go) với dữ liệu thật từ smartflood.vn: đăng nhập, bản đồ và các chức năng chính hoạt động.
- Chưa đo hiệu năng (NFR-04) và độ trễ realtime (NFR-02).
- Chưa có kiểm thử tự động (không có file test). Hiện kiểm tra bằng `npm run typecheck` (không lỗi), đóng gói Android thử, và chạy thử các màn ở chế độ DEMO.
- Chưa có bản build APK/IPA và chưa đo trên nhiều cỡ màn hình.
- Chưa kiểm tra Push trong các trạng thái app mở / nền / đóng (vì chưa có Push).

---

## 13. Nghiệm thu và kiểm thử

### 13.1 Checklist nghiệm thu MVP

(Lấy từ mục 8.2 của tài liệu yêu cầu. Cột cuối là kết quả đến 23/10/2026; "chưa thử" nghĩa là chưa có ai chạy và ghi lại.)

| # | Nội dung | Kết quả |
|---|---|---|
| 1 | Đăng ký/OTP, đăng nhập; mã sai/hết hạn, phiên hết hạn, đăng xuất | Đăng nhập: đạt trên iPhone với máy chủ thật. Đăng ký/OTP, mã sai, hết hạn: chưa thử trên máy thật |
| 2 | Đổi trạm cập nhật đúng Tổng quan, Bản đồ, chi tiết, lịch sử, dự báo | Đạt ở chế độ DEMO; trên máy thật "ổn" nhưng chưa ghi từng bước |
| 3 | Gói đo mới cập nhật UI; offline, dữ liệu cũ, thiếu cảm biến không bị hiển thị là an toàn | Đạt ở DEMO (trạm Q.4 mất kết nối, trạm mới chưa có dữ liệu) |
| 4 | Biểu đồ 1h/24h/7 ngày, tooltip, đơn vị khớp API; khoảng thiếu được nhận biết | Đạt ở DEMO; chưa đối chiếu từng giá trị với API thật |
| 5 | Dự báo đúng nguồn/thời điểm; lỗi dự báo không làm mất dữ liệu hiện tại | Đạt ở DEMO |
| 6 | Theo dõi lưu theo tài khoản; Push mở đúng trạm; đổi tài khoản không nhận nhầm | Theo dõi: có. Push: **chưa có** |
| 7 | Cảnh báo vượt ngưỡng, chuyển cấp, phục hồi, chống lặp; lịch sử lưu giá trị lúc sự kiện | Phụ thuộc máy chủ; lịch sử email hiển thị giá trị lúc gửi |
| 8 | API quản trị từ tài khoản thường bị từ chối; từ chối GPS/Push vẫn dùng được | Từ chối GPS/Push: thiết kế đã xử lý, chưa thử trên máy; quyền do máy chủ kiểm tra |

### 13.2 Kịch bản kiểm thử tay (làm trước buổi thuyết trình)

1. **Luồng chính:** đăng nhập → chọn trạm → theo dõi → (DEMO) chờ 15 giây thấy dải đỏ Q.7 → chạm dải đỏ mở đúng trạm → xem lịch sử 1h/24h/7d.
2. **Luồng lỗi:** đang xem một trạm, tắt Wi-Fi → vẫn thấy số cũ kèm dòng "Không cập nhật được" → bật lại → số tự mới.
3. **Trạm offline:** trạm Q.4 (DEMO) màu xám, ghi dữ liệu cũ, **không có vòng ngập**, không xuất hiện trong "Đang ngập".
4. **Kiểm tra tuyến:** chọn A, B gần Q.1 → báo ngập đúng trạm; chọn A, B gần Q.4 → báo "Chưa đủ dữ liệu đánh giá".
5. **Từ chối quyền:** từ chối vị trí rồi bấm ◎ → có thông báo, app không hỏng.
6. **Mở lại app:** đóng hẳn rồi mở → còn đăng nhập, còn nhớ trạm đã chọn.

Checklist chi tiết trước thuyết trình (pin, Wi-Fi, tài khoản Expo...) ở `README.md` mục 11.

### 13.3 Lệnh kiểm tra code

```bash
npm run typecheck      # tsc --noEmit; phải không có lỗi trước khi nộp/bàn giao
npx expo-doctor        # kiểm tra cấu hình và phiên bản thư viện
```

---

## 14. Phân vai: phần nào học sinh sửa được

Nguyên tắc: học sinh phải **hiểu và giải thích được** mọi thứ mình sửa. Bắt đầu bằng các thay đổi nhỏ, an toàn; mỗi thay đổi ghi vào sổ nhật ký (và nhật ký câu lệnh nếu có dùng AI, xem mục 15).

### 14.1 Sửa an toàn (khuyến nghị cho người mới)

| Muốn | Sửa file |
|---|---|
| Đổi màu một mức ngập | `constants/floodLevelStyles.ts` |
| Đổi màu chủ đạo | `constants/appColors.ts` |
| Đổi chu kỳ tải lại | `config/appConfig.ts` |
| Đổi chữ tab | `app/(tabs)/_layout.tsx` |
| Đổi nội dung màn giới thiệu | `app/onboarding.tsx` (mảng `FEATURES`) |
| Thêm/sửa trạm mẫu cho DEMO | `demo/demoStations.ts` |
| Đổi giao diện nhãn trạm / vòng ngập | `components/map/StationMarker.tsx`, `FloodZoneCircle.tsx` |

### 14.2 Sửa cẩn thận (hiểu rồi mới sửa; nên hỏi người hướng dẫn)

Phần giữ cho các quy tắc R-01 → R-08 đúng. Sửa nhầm có thể làm app báo "an toàn" khi chưa chắc an toàn:

`utils/isStationDataFresh.ts`, `utils/applyRealtimeEvent.ts`, `utils/findUnreliableStationsNearRoute.ts`, `hooks/useAutoRefresh.ts`, `api/requestJson.ts`, `api/mappers/*`, `state/*`, `utils/splitSeriesAtGaps.ts`.

### 14.3 Việc phù hợp để học sinh làm thật (có ý nghĩa với đề tài)

1. Đọc và **kể lại** luồng dữ liệu ở mục 3.2 bằng lời của mình.
2. Tự kiểm tra các quy tắc R-01 → R-08 ở chế độ DEMO và ghi kết quả vào sổ.
3. Làm một chức năng nhỏ còn thiếu ở mục 12.1 (ví dụ lọc lịch sử cảnh báo theo mức), theo "Thêm một màn / một API" ở `README.md` mục 7.
4. Phân tích dữ liệu mực nước và xây mô hình dự báo (mục 16), **đây là phần khoa học của đề tài**.

---

## 15. Nguồn gốc mã và việc dùng AI

Phần này để đáp ứng yêu cầu của **Phụ lục 1** (Hướng dẫn sử dụng AI tạo sinh) trong Kế hoạch cuộc thi KHKT cấp thành phố 2026–2027: dùng AI viết mã nguồn ban đầu là được phép **nếu trích dẫn rõ phần nào do AI tạo ra và kèm nhật ký câu lệnh (prompt log)**.

### 15.1 Khai báo

Điền bảng này trung thực, theo đúng thực tế ai làm phần nào và có dùng AI hay không. Để trống ô nào chưa rõ, không đoán.

| Thành phần | Nguồn / ai thực hiện | Có dùng AI không? (công cụ, ngày; nếu có thì ghi vào prompt log) |
|---|---|---|
| Mã trong `src/` (màn hình, thành phần, kho dữ liệu, API, tiện ích, dữ liệu DEMO) | | |
| Tài liệu `README.md`, `SPEC.md` | | |
| Cấu hình dự án (`package.json`, `app.json`, `tsconfig.json`, `assets/`, `AGENTS.md`) | | |
| Máy chủ web và API (smartflood.vn) | **Không thuộc app này.** Nguồn gốc mã máy chủ ghi riêng trong báo cáo (xem `SmartFlood_Danh_sach_van_de.docx`) | |
| Thư viện bên thứ ba | Expo, React Native, react-native-maps, react-native-svg, socket.io-client... theo `package.json` | |

### 15.2 Việc cần làm để đúng quy định

- **Giữ nhật ký câu lệnh (prompt log)** của mọi lần dùng AI để viết hoặc sửa code, kèm ngày, và lưu trong sổ nhật ký nghiên cứu.
- Phần code **do học sinh tự viết hoặc tự sửa** ghi vào bảng 15.3, tách khỏi phần do AI tạo.
- **Không dùng AI** để viết bản thảo báo cáo, tóm tắt, poster, **kết luận và hướng phát triển**, hay tìm/tạo tài liệu tham khảo (Phụ lục 1 ghi "không bao giờ được chấp nhận").
- Việc **giải thích dữ liệu** và kết luận khoa học do học sinh làm.
- Báo cáo chỉ mô tả phần việc của học sinh, tách khỏi phần của người hướng dẫn và những người khác. Cần nói rõ phần nào có dùng AI, phần nào học sinh tự làm và hiểu.

### 15.3 Nhật ký thay đổi của học sinh (điền khi sửa code)

| Ngày | Học sinh | File đã sửa | Sửa gì và vì sao | Có dùng AI không? (nếu có: ghi vào prompt log) |
|---|---|---|---|---|
| | | | | |
| | | | | |
| | | | | |

---

## 16. Hướng mở rộng: mô hình hồi quy tuyến tính

### 16.1 Hiện trạng

- Báo cáo đề tài nói dự báo mực nước sau 5 phút bằng **hồi quy tuyến tính** từ mực nước hiện tại $H$, tốc độ thay đổi $V$, nhiệt độ $T$, độ ẩm $RH$, ánh sáng $L$.
- **Máy chủ hiện chưa có mô hình này.** Nó chỉ có mô hình quy tắc `rule_based_sensor_weather_v1` (mục 4.4). App hiển thị đúng những gì máy chủ trả và **không tự tính** (FR-08).
- Vì vậy mô hình hồi quy là **phần nghiên cứu cần làm thật**, đồng thời là chỗ sửa lỗi lệch giữa báo cáo và hệ thống.

### 16.2 Đề xuất cho học sinh (làm ngoài app, ghi vào sổ nhật ký)

Bắt đầu bằng **một biến** để hiểu bản chất:

$$\hat h(t+5) = h(t) + a\cdot V(t) + b$$

với $V(t)$ là mức thay đổi mực nước trên mỗi phút trong vài phút gần nhất. Các bước:

1. Lấy dữ liệu mực nước thật của một trạm (xuất từ lịch sử), ghi rõ nguồn, khoảng thời gian và số điểm.
2. Tính $V$ và giá trị thật sau 5 phút; tìm $a, b$ (Google Sheets: `SLOPE`, `INTERCEPT`, hoặc Python).
3. Đánh giá bằng $\text{MAE}=\frac{1}{n}\sum |h-\hat h|$ và $\text{RMSE}$ trên dữ liệu **không dùng để tìm $a, b$**.
4. So sánh với cách dự đoán đơn giản "5 phút nữa bằng bây giờ" để biết mô hình có thật sự tốt hơn không.
5. Mở rộng thêm $T, RH, L$ nếu muốn, xem biến nào thật sự có ích.
6. **Ghi số thật tự tính ra**, kể cả khi không tái lập được số trong báo cáo hiện tại (MAE 0.344 cm, R² 0.995). Ghi rõ hạn chế: dữ liệu thưa, ít trạm, ít sự kiện ngập.

### 16.3 Nếu muốn đưa vào hệ thống

- **Máy chủ** tính và trả dự báo với `method` mới (ví dụ `linear_regression_v1`) và `valid_until`; app **không tự tính** (giữ FR-08).
- **Phía app cần sửa:** `types/FloodForecast.ts` (thêm trường nếu cần), `api/mappers/toFloodForecast.ts`, `components/forecast/ForecastSummaryCard.tsx` (câu giải thích hiện đang viết cho mô hình quy tắc, phải đổi theo `method`).
- **Không đổi tên** mô hình quy tắc thành "AI" hoặc "hồi quy" cho đến khi có mô hình thật và đánh giá riêng (tài liệu yêu cầu, mục 6.1).
- Công thức đa trạm (trạm thượng nguồn, mưa, thủy triều) trong infographic của đề tài **chưa có trong code lẫn báo cáo**; nếu dùng phải làm riêng và ghi rõ.

---

## 17. Lịch sử thay đổi

| Phiên bản | Ngày | Thay đổi |
|---|---|---|
| 1.0 | 23/10/2026 | Bản đầu tiên: đặc tả đúng với app Expo hiện tại, đối chiếu SF-APP-REQ-001 v1.0 |
