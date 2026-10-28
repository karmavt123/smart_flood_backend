import { ScrollView, StyleSheet } from 'react-native';

import { stationFilterLabels, type StationFilter } from '@/utils/filterStations';

import { ChoiceChip } from '../common/ChoiceChip';

const FILTERS: StationFilter[] = ['all', 'flooding', 'followed', 'offline'];

/** THANH LỌC TRẠM trên bản đồ: Tất cả / Đang ngập / Đang theo dõi / Mất kết nối (kèm số lượng). */
export function MapFilterBar({
  value,
  counts,
  onChange,
}: {
  value: StationFilter;
  counts: Record<StationFilter, number>;
  onChange: (filter: StationFilter) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {FILTERS.map((f) => (
        <ChoiceChip key={f} label={`${stationFilterLabels[f]} (${counts[f]})`} selected={value === f} onPress={() => onChange(f)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 12, paddingTop: 4 },
});
