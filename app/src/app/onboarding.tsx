import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/common/AppButton';
import { appColors } from '@/constants/appColors';
import { markOnboardingSeen } from '@/storage/onboardingStorage';

const FEATURES = [
  { icon: '◉', title: 'Xem ngập quanh bạn', text: 'Mở app là thấy ngay trong 2 km quanh bạn có ngập không, đường nào đang ngập.' },
  { icon: '!', title: 'Nhận cảnh báo', text: 'Theo dõi trạm gần nhà, trường học để được báo khi nước dâng lên.' },
  { icon: '⇄', title: 'Kiểm tra tuyến đường', text: 'Chọn điểm đi, điểm đến để biết tuyến có đi qua vùng đang ngập không.' },
];

/**
 * MÀN GIỚI THIỆU (FR-01): logo + 3 chức năng chính. Chỉ tự hiện ở lần mở app đầu tiên;
 * bấm "Bắt đầu" hoặc "Bỏ qua" đều vào thẳng màn Bản đồ (app không cần đăng nhập).
 */
export default function OnboardingScreen() {
  const finish = async () => {
    await markOnboardingSeen();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.skipRow}>
        <AppButton title="Bỏ qua" variant="outline" onPress={finish} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.logo}>≈ SmartFlood</Text>
        <Text style={styles.slogan}>Giám sát, cảnh báo sớm và hỗ trợ tránh ngập đô thị</Text>
        {FEATURES.map((f) => (
          <View key={f.title} style={styles.feature}>
            <Text style={styles.icon}>{f.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          </View>
        ))}
        <Text style={styles.disclaimer}>
          Số liệu từ các trạm đo chỉ để tham khảo, không thay thế cảnh báo và hướng dẫn của cơ quan chức năng.
        </Text>
      </ScrollView>
      <View style={styles.bottom}>
        <AppButton title="Bắt đầu" onPress={finish} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: appColors.background },
  skipRow: { alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 8 },
  content: { padding: 24, gap: 16 },
  logo: { fontSize: 36, fontWeight: '900', color: appColors.primary, textAlign: 'center', marginTop: 24 },
  slogan: { fontSize: 15, color: appColors.textMuted, textAlign: 'center', marginBottom: 16 },
  feature: { flexDirection: 'row', gap: 14, backgroundColor: appColors.card, borderRadius: 16, padding: 16, alignItems: 'center' },
  icon: { fontSize: 28, fontWeight: '900', color: appColors.primary, width: 36, textAlign: 'center' },
  featureTitle: { fontSize: 16, fontWeight: '800', color: appColors.text },
  featureText: { color: appColors.textMuted, marginTop: 2 },
  bottom: { padding: 16 },
  disclaimer: { color: appColors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 8 },
});
