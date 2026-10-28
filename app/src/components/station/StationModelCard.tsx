import { StyleSheet, Text, View } from 'react-native';

import { getStationModels } from '@/api/stations/getStationModels';
import { appColors } from '@/constants/appColors';
import { modelVariableLabels } from '@/constants/modelVariables';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import type { StationModel } from '@/types/StationModel';
import { formatDateTime } from '@/utils/formatDateTime';
import { formatModelFormula } from '@/utils/formatModelFormula';
import { formatModelNumber } from '@/utils/formatModelNumber';
import { sortModelVariables } from '@/utils/sortModelVariables';

import { Card } from '../common/Card';
import { SectionTitle } from '../common/SectionTitle';

/**
 * THẺ "CÔNG THỨC DỰ ĐOÁN RIÊNG CỦA TRẠM" (thông tin kỹ thuật — cho giám khảo xem):
 *  - Công thức mới nhất, ý nghĩa từng biến, sai số, trạm đã nhận chưa.
 *  - Lịch sử các phiên bản: máy chủ học lại mỗi ngày từ dữ liệu lúc đường ngập của chính trạm,
 *    nên mỗi trạm dần có công thức riêng. Mỗi phiên bản so với phiên bản ngay trước nó.
 */
export function StationModelCard({ nodeId, currentVersion }: { nodeId: string; currentVersion: number | null }) {
  const models = useAutoRefresh(() => getStationModels(nodeId), [nodeId, currentVersion]);
  const list = models.data ?? [];
  const current = list[list.length - 1];

  return (
    <Card>
      <SectionTitle>Công thức dự đoán riêng của trạm</SectionTitle>

      {models.loading && !models.data ? <Text style={styles.muted}>Đang tải…</Text> : null}
      {models.error && !models.data ? <Text style={styles.error}>Không tải được: {models.error}</Text> : null}
      {models.data && !current ? (
        <>
          <Text style={styles.emptyTitle}>Trạm chưa có công thức dự đoán</Text>
          <Text style={styles.muted}>
            Máy chủ chỉ học công thức khi đã có đủ dữ liệu lúc đường đang ngập (khoảng 2,5 giờ ngập). Học xong, công thức
            được gửi xuống trạm và hiện ở đây.
          </Text>
        </>
      ) : null}
      {current ? (
        <Text style={styles.muted}>
          Mỗi ngày máy chủ học lại công thức từ dữ liệu lúc đường ngập của chính trạm này, chỉ giữ công thức mới khi nó đoán
          chính xác hơn, rồi gửi hệ số mới xuống trạm. Vì vậy mỗi trạm dần có công thức riêng, hợp với địa hình nơi đặt trạm.
        </Text>
      ) : null}

      {current ? (
        <>
          <Text style={styles.label}>
            Mới nhất: v{current.version} ({current.source === 'server' ? 'máy chủ học' : 'trạm gửi lên'})
          </Text>
          <Text style={styles.small}>{describeDelivery(current)}</Text>
          <View style={styles.formulaBox}>
            <Text style={styles.formula}>{formatModelFormula(current)}</Text>
          </View>
          <Text style={styles.small}>
            {sortModelVariables(Object.keys(current.coefficients))
              .map((name) => `${name} = ${modelVariableLabels[name] ?? name}`)
              .join(' · ')}
          </Text>
          <Text style={styles.small}>{describeAccuracy(current)}</Text>

          {list.length > 1 ? (
            <>
              <Text style={styles.label}>Các phiên bản ({list.length})</Text>
              {list.map((model, index) => (
                <View key={model.version} style={styles.versionRow}>
                  <Text style={styles.versionName}>v{model.version}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.small}>
                      {`Học xong ${formatDateTime(model.trainedAt ?? model.firstSeenAt)}`}
                      {model.maeCm !== null ? ` · sai số ${formatModelNumber(model.maeCm)} cm` : ''}
                    </Text>
                    {index > 0 ? <Text style={styles.change}>{describeChanges(list[index - 1]!, model)}</Text> : null}
                  </View>
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.small}>Mới có 1 phiên bản, chưa học lại lần nào.</Text>
          )}
        </>
      ) : null}
    </Card>
  );
}

/** "Sai số trung bình 0,27 cm · R² 0,997 · học từ 146 mẫu" (phần nào không có thì bỏ). */
function describeAccuracy(model: StationModel): string {
  const parts = [
    model.maeCm !== null ? `Sai số trung bình ${formatModelNumber(model.maeCm)} cm` : null,
    model.r2 !== null ? `R² ${formatModelNumber(model.r2)}` : null,
    model.samples ? `học từ ${model.samples} mẫu lúc đường ngập` : null,
  ].filter(Boolean);
  if (!parts.length) return 'Chưa có số liệu về sai số của công thức.';
  return model.source === 'server'
    ? `${parts.join(' · ')} (đo trên phần dữ liệu mới nhất, công thức chưa được học).`
    : `${parts.join(' · ')} (trạm tự tính).`;
}

/** Trạm đã nhận công thức chưa: "Gửi xuống trạm lúc 00:30 29/10 · trạm dùng từ 00:35 29/10". */
function describeDelivery(model: StationModel): string {
  if (model.source !== 'server') return 'Công thức này do trạm tự gửi lên.';
  if (!model.publishedAt) return 'Máy chủ chưa gửi được xuống trạm (sẽ tự gửi khi có kết nối).';
  const sent = `Đã gửi xuống trạm lúc ${formatDateTime(model.publishedAt)}`;
  return model.appliedAt ? `${sent} · trạm bắt đầu dùng lúc ${formatDateTime(model.appliedAt)}.` : `${sent} · đang chờ trạm báo đã dùng.`;
}

/** So hệ số với phiên bản ngay trước: "H 0,985 → 0,968 · V 4,8 → 6,1". */
function describeChanges(previous: StationModel, model: StationModel): string {
  const names = sortModelVariables([...new Set([...Object.keys(previous.coefficients), ...Object.keys(model.coefficients)])]);
  const changed = names
    .filter((name) => previous.coefficients[name] !== model.coefficients[name])
    .map((name) => `${name} ${formatModelNumber(previous.coefficients[name] ?? 0)} → ${formatModelNumber(model.coefficients[name] ?? 0)}`);
  return changed.length ? `So với v${previous.version}: ${changed.join(' · ')}` : `Hệ số giống v${previous.version}`;
}

const styles = StyleSheet.create({
  muted: { color: appColors.textMuted, fontSize: 12 },
  emptyTitle: { color: appColors.text, fontWeight: '700', marginBottom: 4 },
  error: { color: appColors.danger },
  label: { color: appColors.text, fontWeight: '800', marginTop: 10 },
  formulaBox: { backgroundColor: appColors.background, borderRadius: 10, padding: 10, marginTop: 6 },
  formula: { color: appColors.text, fontWeight: '700', fontSize: 14 },
  small: { color: appColors.textMuted, fontSize: 12, marginTop: 4 },
  versionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: appColors.border,
  },
  versionName: { fontWeight: '900', color: appColors.primary, width: 28 },
  change: { color: appColors.text, fontSize: 12, marginTop: 2 },
});
