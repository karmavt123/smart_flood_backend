import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { appColors } from '@/constants/appColors';
import { floodLevelStyles, STALE_STATION_COLOR } from '@/constants/floodLevelStyles';
import type { NearbyFlooding } from '@/types/NearbyFlooding';
import { describeNearbyCenter, type NearbyCenterSource } from '@/utils/describeNearbyCenter';
import { formatDistance } from '@/utils/formatDistance';
import { formatSensorValue } from '@/utils/formatSensorValue';
import { isStationDataFresh } from '@/utils/isStationDataFresh';
import { listRoadNames } from '@/utils/listRoadNames';

interface NearbySummaryCardProps {
  nearby: NearbyFlooding | null;
  loading: boolean;
  error: string | null;
  centerSource: NearbyCenterSource;
  radiusM: number;
  onSelectStation: (nodeId: string) => void;
}

const MAX_ITEMS = 3;

/**
 * THẺ "QUANH BẠN" ở đáy màn Bản đồ — điều người dùng cần thấy ĐẦU TIÊN khi mở app:
 *   - Có ngập gần bạn không (trong 2 km), nặng nhất mức nào.
 *   - Các điểm ngập gần nhất: độ ngập, khoảng cách, tên đường bị ngập. Chạm → xem trạm đó.
 *   - Không đủ dữ liệu thì nói thẳng "chưa đủ dữ liệu", KHÔNG bao giờ nói "an toàn".
 * Chạm vào dòng tiêu đề để thu gọn / mở ra.
 */
export function NearbySummaryCard({ nearby, loading, error, centerSource, radiusM, onSelectStation }: NearbySummaryCardProps) {
  const [open, setOpen] = useState(true);
  const radiusText = radiusM >= 1000 ? `${Math.round((radiusM / 1000) * 10) / 10} km` : `${radiusM} m`;

  let color: string = appColors.textMuted;
  let headline = 'Đang xem tình hình ngập quanh bạn…';
  let detail: string | null = null;
  if (nearby) {
    if (nearby.state === 'flooding') {
      color = floodLevelStyles[nearby.worstLevel].color;
      headline = `${floodLevelStyles[nearby.worstLevel].symbol} Có ngập gần bạn`;
      detail = `${nearby.counts.flooding} điểm ngập trong ${radiusText} · nặng nhất: ${floodLevelStyles[nearby.worstLevel].label}`;
    } else if (nearby.state === 'clear') {
      color = floodLevelStyles.normal.color;
      headline = `✓ Chưa ghi nhận ngập trong ${radiusText}`;
      detail = `${nearby.counts.online} trạm gần đây đang hoạt động, chưa trạm nào báo ngập.`;
    } else {
      color = STALE_STATION_COLOR;
      headline = '? Chưa đủ dữ liệu quanh đây';
      detail = `Không có trạm nào đang hoạt động trong ${radiusText} — KHÔNG có nghĩa là an toàn.`;
    }
  } else if (error) {
    color = appColors.danger;
    headline = 'Không tải được tình hình quanh bạn';
    detail = error;
  } else if (!loading) {
    headline = 'Chưa có vị trí để xem';
  }

  const flooded = (nearby?.stations ?? []).filter(
    ({ station }) => isStationDataFresh(station) && ['warning', 'danger', 'critical'].includes(station.floodLevel),
  );

  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <Pressable onPress={() => setOpen((v) => !v)} accessibilityRole="button" accessibilityLabel="Thu gọn hoặc mở thẻ Quanh bạn">
        <Text style={styles.kicker}>
          QUANH BẠN · {radiusText} · {describeNearbyCenter(centerSource)} {open ? '▾' : '▸'}
        </Text>
        <Text style={[styles.headline, { color }]}>{headline}</Text>
      </Pressable>
      {open ? (
        <>
          {detail ? <Text style={styles.detail}>{detail}</Text> : null}
          {flooded.slice(0, MAX_ITEMS).map(({ station, distanceM }) => {
            const roads = nearby ? listRoadNames(nearby.floodedRoads, station.nodeId) : '';
            const style = floodLevelStyles[station.floodLevel];
            return (
              <Pressable key={station.nodeId} style={styles.item} onPress={() => onSelectStation(station.nodeId)}>
                <Text style={[styles.itemLevel, { color: style.color }]}>
                  {style.symbol} {formatSensorValue(station.waterLevelCm, 'cm', 0)}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {station.name}
                  </Text>
                  <Text style={styles.itemMeta} numberOfLines={1}>
                    {style.label} · cách {formatDistance(distanceM)}
                    {roads ? ` · đoạn ngập: ${roads}` : ''}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            );
          })}
          {flooded.length > MAX_ITEMS ? <Text style={styles.note}>… và {flooded.length - MAX_ITEMS} điểm khác (xem trên bản đồ).</Text> : null}
          {nearby && nearby.counts.stale > 0 ? (
            <Text style={styles.note}>{nearby.counts.stale} trạm gần đây đang mất kết nối nên không biết tình hình.</Text>
          ) : null}
          {nearby && (nearby.roadsStatus === 'unavailable' || nearby.roadsStatus === 'partial') ? (
            <Text style={styles.note}>Chưa lấy được hình dạng đường — đang vẽ vòng tròn vùng ảnh hưởng thay cho tô màu đường.</Text>
          ) : null}
          {nearby && nearby.floodedRoads.length > 0 ? (
            <Text style={styles.note}>Đường tô màu là ước lượng: các đoạn đường trong vùng ảnh hưởng của trạm đang ngập.</Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    gap: 4,
    borderLeftWidth: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  kicker: { fontSize: 11, fontWeight: '800', color: appColors.textMuted, letterSpacing: 0.3 },
  headline: { fontSize: 19, fontWeight: '900', marginTop: 2 },
  detail: { color: appColors.text, fontSize: 13 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: appColors.border,
    marginTop: 2,
  },
  itemLevel: { fontSize: 16, fontWeight: '900', minWidth: 62 },
  itemName: { fontWeight: '800', color: appColors.text },
  itemMeta: { color: appColors.textMuted, fontSize: 12 },
  chevron: { fontSize: 22, color: appColors.textMuted },
  note: { color: appColors.textMuted, fontSize: 11, marginTop: 2 },
});
