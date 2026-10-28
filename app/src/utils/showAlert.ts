import { Alert, Platform } from 'react-native';

/**
 * HIỆN HỘP THÔNG BÁO có tiêu đề + nội dung, chạy được cả điện thoại lẫn trình duyệt.
 * (Alert.alert của React Native không hiện gì khi chạy trên web, nên web dùng window.alert.)
 */
export function showAlert(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
