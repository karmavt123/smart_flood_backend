import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/common/AppButton';
import { ChoiceChip } from '@/components/common/ChoiceChip';
import { EmptyView } from '@/components/common/EmptyView';
import { ErrorView } from '@/components/common/ErrorView';
import { LoadingView } from '@/components/common/LoadingView';
import { StaleDataWarning } from '@/components/common/StaleDataWarning';
import { TextField } from '@/components/common/TextField';
import { StationListItem } from '@/components/station/StationListItem';
import { appColors } from '@/constants/appColors';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { openStationDetail } from '@/navigation/openStationDetail';
import { useFavorites } from '@/state/FavoritesProvider';
import { useStations } from '@/state/StationsProvider';
import type { Station } from '@/types/Station';
import { distanceInMeters } from '@/utils/distanceInMeters';
import { filterStations, stationFilterLabels, type StationFilter } from '@/utils/filterStations';
import { formatDistance } from '@/utils/formatDistance';
import { searchStations } from '@/utils/searchStations';
import { showAlert } from '@/utils/showAlert';
import { sortStations, stationSortLabels, type StationSort } from '@/utils/sortStations';

const FILTERS = Object.keys(stationFilterLabels) as StationFilter[];
const SORTS = Object.keys(stationSortLabels) as StationSort[];

/**
 * MÀN HÌNH DANH SÁCH TRẠM (FR-05).
 * Tìm theo tên/mã trạm (gõ không dấu cũng được), lọc theo trạng thái, sắp xếp theo
 * tên / độ ngập / cập nhật mới nhất / khoảng cách (cần vị trí). Chạm một trạm → mở chi tiết.
 */
export default function StationsScreen() {
  const { stations, loading, error, refresh } = useStations();
  const { followedIds, isFollowed } = useFavorites();
  const location = useCurrentLocation();
  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = useState<StationFilter>('all');
  const [sort, setSort] = useState<StationSort>('name');
  const [pullRefreshing, setPullRefreshing] = useState(false);

  const visible = useMemo(
    () => sortStations(searchStations(filterStations(stations, filter, followedIds), keyword), sort, location.position),
    [stations, filter, followedIds, keyword, sort, location.position],
  );

  const onChooseSort = async (next: StationSort) => {
    if (next === 'distance' && !location.position) {
      const { position, error } = await location.requestLocation();
      if (!position) {
        showAlert('Chưa lấy được vị trí', error ?? 'Hãy cho phép app dùng vị trí để sắp xếp theo khoảng cách.');
        return;
      }
    }
    setSort(next);
  };

  const clearFilters = () => {
    setKeyword('');
    setFilter('all');
  };

  const onPullRefresh = async () => {
    setPullRefreshing(true);
    await refresh();
    setPullRefreshing(false);
  };

  const distanceText = (station: Station) => {
    if (!location.position || station.latitude === null || station.longitude === null) return undefined;
    return formatDistance(distanceInMeters(location.position, { latitude: station.latitude, longitude: station.longitude }));
  };

  if (loading && stations.length === 0) return <LoadingView text="Đang tải danh sách trạm…" />;
  if (error && stations.length === 0) return <ErrorView message={error} onRetry={refresh} />;

  const header = (
    <View style={styles.header}>
      <TextField
        label="Tìm trạm"
        placeholder="Nhập tên hoặc mã trạm, ví dụ: quan 1"
        value={keyword}
        onChangeText={setKeyword}
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      <Text style={styles.groupLabel}>Lọc</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {FILTERS.map((f) => (
          <ChoiceChip key={f} label={stationFilterLabels[f]} selected={filter === f} onPress={() => setFilter(f)} />
        ))}
      </ScrollView>
      <Text style={styles.groupLabel}>Sắp xếp</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {SORTS.map((s) => (
          <ChoiceChip key={s} label={stationSortLabels[s]} selected={sort === s} onPress={() => onChooseSort(s)} />
        ))}
      </ScrollView>
      <StaleDataWarning error={error} />
      <Text style={styles.count}>
        {visible.length}/{stations.length} trạm
      </Text>
    </View>
  );

  return (
    <FlatList
      data={visible}
      keyExtractor={(s) => s.nodeId}
      ListHeaderComponent={header}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={pullRefreshing} onRefresh={onPullRefresh} />}
      renderItem={({ item }) => (
        <StationListItem
          station={item}
          followed={isFollowed(item.nodeId)}
          distanceText={distanceText(item)}
          onPress={() => openStationDetail(item.nodeId)}
        />
      )}
      ListEmptyComponent={
        <EmptyView
          text={stations.length === 0 ? 'Chưa có trạm nào.' : 'Không có trạm nào khớp với tìm kiếm / bộ lọc.'}
          action={stations.length === 0 ? undefined : <AppButton title="Xóa bộ lọc" variant="outline" onPress={clearFilters} />}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  header: { gap: 6, marginBottom: 4 },
  groupLabel: { fontWeight: '700', color: appColors.textMuted, marginTop: 4 },
  count: { color: appColors.textMuted, fontSize: 12, marginTop: 4 },
});
