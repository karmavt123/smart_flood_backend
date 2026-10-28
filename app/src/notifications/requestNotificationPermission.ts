import * as Notifications from 'expo-notifications';

/**
 * XIN QUYỀN HIỆN THÔNG BÁO. Chỉ gọi khi người dùng tự bật "Thông báo trên điện thoại"
 * trong màn Cài đặt (xin quyền theo ngữ cảnh, NFR-06).
 * @returns true nếu được phép.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}
