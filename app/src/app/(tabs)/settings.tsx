import Constants from 'expo-constants';
import { Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { SectionTitle } from '@/components/common/SectionTitle';
import { FollowedStationRow } from '@/components/settings/FollowedStationRow';
import { API_BASE_URL, DEMO_MODE } from '@/config/appConfig';
import { appColors } from '@/constants/appColors';
import { openStationDetail } from '@/navigation/openStationDetail';
import { notificationPermissionLabels, useNotificationPermissionStatus } from '@/notifications/useNotificationPermissionStatus';
import { useFavorites } from '@/state/FavoritesProvider';
import { useNotificationSettings } from '@/state/NotificationSettingsProvider';
import { useStations } from '@/state/StationsProvider';
import { showAlert } from '@/utils/showAlert';

/**
 * MÀN HÌNH CÀI ĐẶT (FR-12, FR-15) — app không cần tài khoản nên màn này chỉ có:
 * bật/tắt thông báo trên điện thoại, danh sách trạm đang theo dõi (lưu trên máy), thông tin app.
 */
export default function SettingsScreen() {
  const { followedIds } = useFavorites();
  const { findStation } = useStations();
  const { phoneAlertsEnabled, setPhoneAlertsEnabled } = useNotificationSettings();
  const permission = useNotificationPermissionStatus();

  const onTogglePhoneAlerts = async (enabled: boolean) => {
    const ok = await setPhoneAlertsEnabled(enabled);
    await permission.refresh();
    if (!ok) {
      showAlert('Chưa có quyền thông báo', 'Hãy vào Cài đặt điện thoại → SmartFlood (hoặc Expo Go) → Thông báo để cho phép.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <SectionTitle>Thông báo trên điện thoại</SectionTitle>
        {Platform.OS === 'web' ? (
          <Text style={styles.muted}>
            Đang chạy trên trình duyệt: không có thông báo kiểu điện thoại, nhưng vẫn có dải cảnh báo đỏ trên đầu màn hình khi
            trạm tăng mức ngập.
          </Text>
        ) : (
          <>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Báo khi trạm đang theo dõi tăng mức ngập</Text>
              <Switch value={phoneAlertsEnabled} onValueChange={onTogglePhoneAlerts} />
            </View>
            <Text style={styles.muted}>Quyền thông báo: {notificationPermissionLabels[permission.status]}</Text>
          </>
        )}
        <Text style={styles.note}>
          Lưu ý: máy chủ chưa gửi thông báo đẩy (push), nên app chỉ báo được khi đang mở hoặc vừa chạy nền.
        </Text>
      </Card>

      <Card>
        <SectionTitle>Trạm đang theo dõi ({followedIds.length})</SectionTitle>
        {followedIds.length === 0 ? (
          <Text style={styles.muted}>Chưa theo dõi trạm nào. Mở một trạm trên Bản đồ hoặc tab Trạm rồi bấm "Theo dõi".</Text>
        ) : null}
        {followedIds.map((nodeId) => (
          <FollowedStationRow
            key={nodeId}
            nodeId={nodeId}
            name={findStation(nodeId)?.name ?? nodeId}
            onOpen={() => openStationDetail(nodeId)}
          />
        ))}
        <Text style={styles.note}>Danh sách này lưu ngay trên máy này (app không cần tài khoản).</Text>
      </Card>

      <Card>
        <SectionTitle>Thông tin app</SectionTitle>
        <Text style={styles.muted}>Máy chủ: {DEMO_MODE ? 'không dùng (chế độ demo, dữ liệu mẫu)' : API_BASE_URL}</Text>
        <Text style={styles.muted}>Phiên bản: {Constants.expoConfig?.version ?? '—'}</Text>
        <Text style={styles.note}>
          Độ ngập do các node đo tại 1 điểm; đường tô màu trên bản đồ là ước lượng quanh trạm đang ngập. Trạm mất kết nối không
          có nghĩa là khu vực đó an toàn.
        </Text>
        <Text style={styles.note}>
          Số liệu trong app chỉ để tham khảo, không thay thế cảnh báo và hướng dẫn của cơ quan chức năng.
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  muted: { color: appColors.textMuted, marginTop: 2 },
  note: { color: appColors.textMuted, fontSize: 12, marginTop: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  switchLabel: { flex: 1, color: appColors.text, fontWeight: '600' },
});
