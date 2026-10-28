import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { appColors } from '@/constants/appColors';
import { formatClockTime } from '@/utils/formatClockTime';
import { formatDateTime } from '@/utils/formatDateTime';
import { formatDayAndTime } from '@/utils/formatDayAndTime';
import { splitSeriesAtGaps, type ChartPoint } from '@/utils/splitSeriesAtGaps';

const PAD = { left: 46, right: 14, top: 14, bottom: 26 };

interface HistoryLineChartProps {
  points: ChartPoint[];
  unit: string;
  /** Số chữ số lẻ khi ghi giá trị (triều theo mét cần 2: 1.35 m). */
  digits?: number;
  /** Vẽ đường ngưỡng nét đứt (dùng cho độ ngập). */
  threshold?: number | null;
  height?: number;
}

/**
 * BIỂU ĐỒ LỊCH SỬ (FR-07), tự vẽ bằng SVG:
 *  - trục thời gian theo đúng thời điểm đo (điểm thưa thì cách xa nhau);
 *  - KHÔNG nối đường qua khoảng thiếu dữ liệu;
 *  - chạm vào biểu đồ → hiện thời gian, giá trị, đơn vị của điểm gần nhất.
 */
export function HistoryLineChart({ points, unit, digits = 1, threshold = null, height = 220 }: HistoryLineChartProps) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<ChartPoint | null>(null);

  if (points.length === 0) {
    return <Text style={styles.empty}>Không có dữ liệu trong khoảng thời gian này.</Text>;
  }

  const values = points.map((p) => p.value);
  let min = Math.min(...values, threshold ?? Infinity);
  let max = Math.max(...values, threshold ?? -Infinity);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const t0 = points[0].timeMs;
  const t1 = points[points.length - 1].timeMs === t0 ? t0 + 1 : points[points.length - 1].timeMs;
  const innerW = Math.max(1, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const x = (t: number) => PAD.left + ((t - t0) / (t1 - t0)) * innerW;
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * innerH;
  const axisLabel = t1 - t0 > 20 * 3600 * 1000 ? formatDayAndTime : formatClockTime;

  const segments = splitSeriesAtGaps(points).map((seg) =>
    seg.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.timeMs).toFixed(1)},${y(p.value).toFixed(1)}`).join(' '),
  );

  const onPress = (e: GestureResponderEvent) => {
    const tapX = e.nativeEvent.locationX;
    let best = points[0];
    for (const p of points) if (Math.abs(x(p.timeMs) - tapX) < Math.abs(x(best.timeMs) - tapX)) best = p;
    setSelected(best);
  };

  return (
    <View>
      <Text style={styles.tooltip}>
        {selected
          ? `${formatDateTime(new Date(selected.timeMs).toISOString())} — ${selected.value.toFixed(digits)} ${unit}`
          : `Chạm vào biểu đồ để xem từng điểm · ${points.length} lần đo`}
      </Text>
      <Pressable onPress={onPress} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            <SvgText x={4} y={PAD.top + 4} fontSize={10} fill={appColors.textMuted}>
              {max.toFixed(digits)}
            </SvgText>
            <SvgText x={4} y={PAD.top + innerH} fontSize={10} fill={appColors.textMuted}>
              {min.toFixed(digits)}
            </SvgText>
            <Line x1={PAD.left} y1={PAD.top + innerH} x2={PAD.left + innerW} y2={PAD.top + innerH} stroke={appColors.border} />
            {threshold !== null ? (
              <>
                <Line x1={PAD.left} y1={y(threshold)} x2={PAD.left + innerW} y2={y(threshold)} stroke={appColors.danger} strokeDasharray="6 4" />
                <SvgText x={PAD.left + 4} y={y(threshold) - 4} fontSize={10} fill={appColors.danger}>
                  Ngưỡng {threshold} {unit}
                </SvgText>
              </>
            ) : null}
            {segments.map((d, i) => (
              <Path key={i} d={d} stroke={appColors.primary} strokeWidth={2.2} fill="none" />
            ))}
            {selected ? <Circle cx={x(selected.timeMs)} cy={y(selected.value)} r={4.5} fill={appColors.primary} /> : null}
            <SvgText x={PAD.left} y={height - 7} fontSize={10} fill={appColors.textMuted}>
              {axisLabel(new Date(t0).toISOString())}
            </SvgText>
            <SvgText x={PAD.left + innerW} y={height - 7} fontSize={10} fill={appColors.textMuted} textAnchor="end">
              {axisLabel(new Date(t1).toISOString())}
            </SvgText>
          </Svg>
        ) : (
          <View style={{ height }} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tooltip: { color: appColors.textMuted, fontSize: 12, marginBottom: 4 },
  empty: { color: appColors.textMuted, paddingVertical: 24, textAlign: 'center' },
});
