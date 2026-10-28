import { ScrollView, StyleSheet, Text } from 'react-native';

import { appColors } from '@/constants/appColors';
import { floodLevelStyles } from '@/constants/floodLevelStyles';
import type { RouteCheckResult } from '@/types/RouteCheckResult';
import type { Station } from '@/types/Station';

/**
 * KẾT QUẢ KIỂM TRA TUYẾN ĐƯỜNG (FR-14): câu kết luận, độ dài/thời gian, các trạm ngập gần tuyến.
 * Quy tắc an toàn: máy chủ nói "an toàn" nhưng gần tuyến có trạm mất kết nối
 * → hiện "Chưa đủ dữ liệu đánh giá", KHÔNG kết luận tuyến an toàn.
 */
export function RouteCheckResultView({ result, unreliableStations }: { result: RouteCheckResult; unreliableStations: Station[] }) {
  const risky = result.riskLevel !== 'normal';
  const unreliableIds = new Set(unreliableStations.map((s) => s.nodeId));
  const notEnoughData = !risky && unreliableStations.length > 0;
  const color = risky ? floodLevelStyles[result.riskLevel].color : notEnoughData ? '#B45309' : appColors.success;
  const message = notEnoughData
    ? `Chưa đủ dữ liệu đánh giá: ${unreliableStations.length} trạm gần tuyến đang mất kết nối, không biết khu vực đó có ngập hay không.`
    : result.message;
  const direct = [result.directStats.distanceLabel, result.directStats.durationLabel].filter(Boolean).join(' · ');
  const suggested = [result.suggestedStats.distanceLabel, result.suggestedStats.durationLabel].filter(Boolean).join(' · ');

  return (
    <ScrollView style={{ maxHeight: 190 }}>
      <Text style={[styles.message, { color }]}>{message}</Text>
      {direct ? <Text style={styles.line}>Tuyến chính: {direct}{risky ? ' (đường đỏ nét đứt — không nên đi)' : ''}</Text> : null}
      {risky && result.safeRouteFound ? (
        <Text style={styles.line}>Tuyến tránh ngập (đường xanh lá){suggested ? `: ${suggested}` : ''}</Text>
      ) : null}
      {result.floodPoints.map((p) => (
        <Text key={p.nodeId} style={styles.point}>
          • {p.name}: {floodLevelStyles[p.level].label}, {p.waterLevelCm} cm, cách tuyến {p.distanceToRouteM} m
          {unreliableIds.has(p.nodeId) ? ' (dữ liệu cũ — trạm đang mất kết nối)' : ''}
        </Text>
      ))}
      {unreliableStations
        .filter((s) => !result.floodPoints.some((p) => p.nodeId === s.nodeId))
        .map((s) => (
          <Text key={s.nodeId} style={styles.point}>
            • {s.name}: mất kết nối — chưa đủ dữ liệu
          </Text>
        ))}
      {!result.routeEngineOk ? <Text style={styles.note}>Dịch vụ chỉ đường đang lỗi, máy chủ dùng đường thẳng để kiểm tra tạm.</Text> : null}
      <Text style={styles.note}>Chỉ xét các trạm đang có trong hệ thống; điểm ngập ngoài mạng lưới trạm sẽ không được phát hiện.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  message: { fontWeight: '800', marginBottom: 4 },
  line: { color: appColors.text, marginBottom: 2 },
  point: { color: appColors.text, fontSize: 13 },
  note: { color: appColors.textMuted, fontSize: 11, marginTop: 4 },
});
