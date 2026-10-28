import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/common/AppButton';
import { DemoModeBanner } from '@/components/common/DemoModeBanner';
import { EmptyView } from '@/components/common/EmptyView';
import { ErrorView } from '@/components/common/ErrorView';
import { LoadingView } from '@/components/common/LoadingView';
import { StaleDataWarning } from '@/components/common/StaleDataWarning';
import { NodePredictionCard } from '@/components/forecast/NodePredictionCard';
import { SystemSummaryCard } from '@/components/overview/SystemSummaryCard';
import { FollowButton } from '@/components/station/FollowButton';
import { SensorMetricsCard } from '@/components/station/SensorMetricsCard';
import { StationPickerBar } from '@/components/station/StationPickerBar';
import { WaterLevelCard } from '@/components/station/WaterLevelCard';
import { openStationDetail } from '@/navigation/openStationDetail';
import { openStationOnMap } from '@/navigation/openStationOnMap';
import { useFavorites } from '@/state/FavoritesProvider';
import { useStations } from '@/state/StationsProvider';

/**
 * MÀN HÌNH TỔNG QUAN — "Home" trong tài liệu yêu cầu (FR-03).
 * Tóm tắt toàn hệ thống, rồi chọn 1 trạm → xem độ ngập, mức ngập, kết nối, dự đoán, thông số đo.
 * Đổi trạm thì mọi thẻ đổi theo ngay, không hiện nhầm số của trạm trước.
 */
export default function OverviewScreen() {
  const { stations, loading, error, refresh, selectedNodeId, selectStation, findStation } = useStations();
  const { followedIds } = useFavorites();
  const [pullRefreshing, setPullRefreshing] = useState(false);

  // Trạm đang xem: trạm đã chọn trước đó → trạm đầu tiên đang theo dõi → trạm đầu tiên.
  const station =
    (selectedNodeId ? findStation(selectedNodeId) : undefined) ??
    stations.find((s) => followedIds.includes(s.nodeId)) ??
    stations[0];

  const onPullRefresh = async () => {
    setPullRefreshing(true);
    await refresh();
    setPullRefreshing(false);
  };

  if (loading && stations.length === 0) return <LoadingView text="Đang tải danh sách trạm…" />;
  if (error && stations.length === 0) return <ErrorView message={error} onRetry={refresh} />;
  if (!station) return <EmptyView text="Chưa có trạm nào hoạt động." action={<AppButton title="Tải lại" variant="outline" onPress={refresh} />} />;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={pullRefreshing} onRefresh={onPullRefresh} />}
    >
      <DemoModeBanner />
      <SystemSummaryCard stations={stations} />
      <StationPickerBar stations={stations} selectedNodeId={station.nodeId} onSelect={selectStation} />
      <StaleDataWarning error={error} />

      <WaterLevelCard station={station} />
      <NodePredictionCard station={station} />
      <SensorMetricsCard reading={station.latest} />

      <View style={styles.buttons}>
        <AppButton title="Xem chi tiết" onPress={() => openStationDetail(station.nodeId)} />
        <AppButton title="Xem trên bản đồ" variant="outline" onPress={() => openStationOnMap(station.nodeId)} />
        <FollowButton nodeId={station.nodeId} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
