import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';

import { RealtimeAlertItem } from '@/components/alerts/RealtimeAlertItem';
import { Card } from '@/components/common/Card';
import { SectionTitle } from '@/components/common/SectionTitle';
import { StationListItem } from '@/components/station/StationListItem';
import { appColors } from '@/constants/appColors';
import { openStationDetail } from '@/navigation/openStationDetail';
import { useFavorites } from '@/state/FavoritesProvider';
import { useRealtime } from '@/state/RealtimeProvider';
import { useStations } from '@/state/StationsProvider';
import { floodLevelRank } from '@/utils/floodLevelRank';
import { isStationDataFresh } from '@/utils/isStationDataFresh';

/**
 * MÀN HÌNH CẢNH BÁO (FR-11), gồm 2 phần:
 *  1. ĐANG CẢNH BÁO: các trạm (dữ liệu còn mới) đang ở mức Cảnh báo trở lên, nặng nhất trước.
 *  2. MỚI NHẬN: các lần trạm TĂNG mức ngập nhận được trong lần mở app này.
 * Chạm vào bất kỳ dòng nào → mở chi tiết trạm.
 */
export default function AlertsScreen() {
  const { stations, refresh } = useStations();
  const { isFollowed } = useFavorites();
  const { sessionAlerts } = useRealtime();
  const [pullRefreshing, setPullRefreshing] = useState(false);

  const activeStations = stations
    .filter((s) => isStationDataFresh(s) && floodLevelRank(s.floodLevel) >= floodLevelRank('warning'))
    .sort((a, b) => floodLevelRank(b.floodLevel) - floodLevelRank(a.floodLevel) || (b.waterLevelCm ?? 0) - (a.waterLevelCm ?? 0));
  const staleCount = stations.filter((s) => !isStationDataFresh(s)).length;

  const onPullRefresh = async () => {
    setPullRefreshing(true);
    await refresh();
    setPullRefreshing(false);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={pullRefreshing} onRefresh={onPullRefresh} />}
    >
      <Card>
        <SectionTitle>Đang cảnh báo ({activeStations.length})</SectionTitle>
        {activeStations.length === 0 ? <Text style={styles.muted}>Hiện không có trạm nào từ mức Cảnh báo trở lên.</Text> : null}
        {activeStations.map((s) => (
          <StationListItem key={s.nodeId} station={s} followed={isFollowed(s.nodeId)} onPress={() => openStationDetail(s.nodeId)} />
        ))}
        {staleCount > 0 ? (
          <Text style={styles.note}>
            {staleCount} trạm đang mất kết nối không được tính ở đây — không biết tình hình nên KHÔNG có nghĩa là an toàn.
          </Text>
        ) : null}
      </Card>

      <Card>
        <SectionTitle>Mới nhận trong lần mở app này ({sessionAlerts.length})</SectionTitle>
        {sessionAlerts.length === 0 ? <Text style={styles.muted}>Chưa có trạm nào tăng mức ngập từ lúc mở app.</Text> : null}
        {sessionAlerts.map((event) => (
          <RealtimeAlertItem key={`${event.nodeId}-${event.receivedAt}`} event={event} onPress={() => openStationDetail(event.nodeId)} />
        ))}
        <Text style={styles.note}>
          App chỉ báo được khi đang mở. Muốn được báo trên điện thoại, hãy theo dõi trạm và bật thông báo trong tab Cài đặt.
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  muted: { color: appColors.textMuted },
  note: { color: appColors.textMuted, fontSize: 12, marginTop: 8 },
});
