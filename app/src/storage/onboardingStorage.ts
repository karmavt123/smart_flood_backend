import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * GHI NHỚ "ĐÃ XEM MÀN GIỚI THIỆU" trên điện thoại (FR-01: chỉ tự hiện lần đầu).
 * Muốn xem lại màn giới thiệu khi thử nghiệm: xóa dữ liệu app Expo Go hoặc cài lại app.
 */
const ONBOARDING_KEY = 'smartflood.onboardingSeen';

export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_KEY)) === 'yes';
  } catch {
    return true; // đọc lỗi thì coi như đã xem, không chặn người dùng
  }
}

export async function markOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'yes');
  } catch {
    // lưu lỗi cũng không sao, lần sau chỉ hiện lại màn giới thiệu
  }
}
