import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/common/AppButton';
import { EmptyView } from '@/components/common/EmptyView';
import { LoadingView } from '@/components/common/LoadingView';
import { StaleDataWarning } from '@/components/common/StaleDataWarning';
import { NodePredictionCard } from '@/components/forecast/NodePredictionCard';
import { FollowButton } from '@/components/station/FollowButton';
import { SensorHistoryCard } from '@/components/station/SensorHistoryCard';
import { SensorMetricsCard } from '@/components/station/SensorMetricsCard';
import { StationLocationCard } from '@/components/station/StationLocationCard';
import { StationModelCard } from '@/components/station/StationModelCard';
import { WaterLevelCard } from '@/components/station/WaterLevelCard';
import { appColors } from '@/constants/appColors';
import { openStationOnMap } from '@/navigation/openStationOnMap';
import { useRealtime } from '@/state/RealtimeProvider';
import { useStations } from '@/state/StationsProvider';

/**
 * MÀN HÌNH CHI TIẾT TRẠM (FR-06, FR-07, FR-08, FR-09).
 * Mở từ Bản đồ, Tổng quan, Trạm, Cảnh báo, Cài đặt hoặc khi chạm vào thông báo.
 * Thứ tự: điều người dùng cần trước (độ ngập, dự đoán) → lịch sử → thông số đo → công thức (kỹ thuật) → vị trí.
 */
export default function StationDetailScreen() {
  const { nodeId } = useLocalSearchParams<{ nodeId: string }>();
  const { findStation, loading, error, refresh } = useStations();
  const { connected } = useRealtime();
  const station = nodeId ? findStation(nodeId) : undefined;
  const [pullRefreshing, setPullRefreshing] = useState(false);

  const onPullRefresh = async () => {
    setPullRefreshing(true);
    await refresh();
    setPullRefreshing(false);
  };

  if (!station) {
    if (loading) return <LoadingView text="Đang tải trạm…" />;
    return (
      <EmptyView
        text={`Không tìm thấy trạm "${nodeId}". Trạm có thể đã bị ẩn hoặc chưa gửi dữ liệu.`}
        action={<AppButton title="Tải lại" variant="outline" onPress={refresh} />}
      />
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={pullRefreshing} onRefresh={onPullRefresh} />}
    >
      <Stack.Screen options={{ title: station.name }} />
      <Text style={[styles.realtime, { color: connected ? appColors.success : appColors.textMuted }]}>
        {connected ? '● Đang nhận dữ liệu realtime' : '○ Đang kết nối lại realtime… (vẫn tự tải lại mỗi 30 giây)'}
      </Text>
      <StaleDataWarning error={error} />

      <WaterLevelCard station={station} />
      <View style={styles.buttons}>
        <FollowButton nodeId={station.nodeId} />
      </View>
      <SensorMetricsCard reading={station.latest} />
      <SensorHistoryCard nodeId={station.nodeId} thresholdCm={station.thresholdCm} />
      <NodePredictionCard station={station} />
      <StationModelCard nodeId={station.nodeId} currentVersion={station.model?.version ?? null} />
      <StationLocationCard station={station} onOpenMap={() => openStationOnMap(station.nodeId)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  realtime: { fontSize: 12, fontWeight: '600' },
  buttons: { flexDirection: 'row', gap: 10 },
});
