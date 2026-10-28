import { StyleSheet, Text, View } from 'react-native';

import { DEMO_MODE } from '@/config/appConfig';
import { appColors } from '@/constants/appColors';

/** DẢI VÀNG "CHẾ ĐỘ DEMO" — để không ai nhầm dữ liệu mẫu là số đo thật. Chỉ hiện khi bật DEMO_MODE. */
export function DemoModeBanner() {
  if (!DEMO_MODE) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>CHẾ ĐỘ DEMO — dữ liệu mẫu, không phải số đo thật</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: appColors.demoBannerBackground, paddingVertical: 4, alignItems: 'center' },
  text: { color: appColors.demoBannerText, fontSize: 12, fontWeight: '800' },
});
