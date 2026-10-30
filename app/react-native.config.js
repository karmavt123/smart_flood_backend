/**
 * CẤU HÌNH LIÊN KẾT THƯ VIỆN NATIVE (autolinking).
 *
 * Bản Android KHÔNG dùng react-native-maps nữa (bản đồ Android = Leaflet + OpenStreetMap trong WebView,
 * xem src/components/map/StationMap.android.tsx) → bỏ hẳn thư viện này khỏi bản build Android.
 * Lý do: react-native-maps kéo theo Google Play Services + WorkManager; bản APK đầu tiên (30/10/2026)
 * văng ngay khi mở vì WorkManager không khởi tạo được (androidx.work.impl.WorkDatabase).
 * iPhone vẫn dùng react-native-maps (bản đồ Apple) nên chỉ tắt cho Android.
 */
module.exports = {
  dependencies: {
    'react-native-maps': {
      platforms: {
        android: null,
      },
    },
  },
};
