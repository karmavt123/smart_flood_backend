import { ScrollView } from 'react-native';

import type { Station } from '@/types/Station';

import { ChoiceChip } from '../common/ChoiceChip';

/** THANH CHỌN TRẠM cuộn ngang (FR-03: đổi trạm ở màn Tổng quan). */
export function StationPickerBar({
  stations,
  selectedNodeId,
  onSelect,
}: {
  stations: Station[];
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
      {stations.map((s) => (
        <ChoiceChip key={s.nodeId} label={s.name} selected={s.nodeId === selectedNodeId} onPress={() => onSelect(s.nodeId)} />
      ))}
    </ScrollView>
  );
}
