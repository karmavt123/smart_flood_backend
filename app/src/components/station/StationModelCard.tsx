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
 *  - Công thức trạm đang dùng, ý nghĩa từng biến, sai số.
 *  - Lịch sử các phiên bản: v1 là công thức chung cho mọi trạm; node tự học lại theo dữ liệu
 *    của chính nó nên các phiên bản sau khác nhau giữa các trạm.
 */
export function StationModelCard({ nodeId, currentVersion }: { nodeId: string; currentVersion: number | null }) {
  const models = useAutoRefresh(() => getStationModels(nodeId), [nodeId, currentVersion]);
  const list = models.data ?? [];
  const current = list[list.length - 1];
  const first = list[0];

  return (
    <Card>
      <SectionTitle>Công thức dự đoán riêng của trạm</SectionTitle>

      {models.loading && !models.data ? <Text style={styles.muted}>Đang tải…</Text> : null}
      {models.error && !models.data ? <Text style={styles.error}>Không tải được: {models.error}</Text> : null}
      {models.data && !current ? (
        <>
          <Text style={styles.emptyTitle}>Trạm chưa có công thức dự đoán</Text>
          <Text style={styles.muted}>Khi trạm có công thức, công thức đang dùng và các phiên bản sẽ hiện ở đây.</Text>
        </>
      ) : null}
      {current ? (
        <Text style={styles.muted}>
          Mọi trạm bắt đầu với cùng 1 công thức hồi quy tuyến tính (v1). Sau một thời gian hoạt động, node tự học lại từ dữ liệu
          của chính nó rồi gửi phiên bản mới lên máy chủ — nên mỗi trạm dần có công thức riêng, hợp với địa hình nơi đặt trạm.
        </Text>
      ) : null}

      {current ? (
        <>
          <Text style={styles.label}>
            Đang dùng: v{current.version}
            {current.version === 1 ? ' (công thức chung)' : ' (node tự học)'}
          </Text>
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
              {list.map((model) => (
                <View key={model.version} style={styles.versionRow}>
                  <Text style={styles.versionName}>v{model.version}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.small}>
                      {model.version === 1 ? 'Công thức chung' : `Học xong ${formatDateTime(model.trainedAt ?? model.firstSeenAt)}`}
                      {model.maeCm !== null ? ` · sai số ${formatModelNumber(model.maeCm)} cm` : ''}
                    </Text>
                    {first && model.version !== first.version ? (
                      <Text style={styles.change}>{describeChanges(first, model)}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.small}>Trạm vẫn đang dùng công thức chung, chưa học lại lần nào.</Text>
          )}
        </>
      ) : null}
    </Card>
  );
}

/** "Sai số trung bình 0,27 cm · R² 0,997 · học từ 25920 mẫu" (phần nào node không gửi thì bỏ). */
function describeAccuracy(model: StationModel): string {
  const parts = [
    model.maeCm !== null ? `Sai số trung bình ${formatModelNumber(model.maeCm)} cm` : null,
    model.r2 !== null ? `R² ${formatModelNumber(model.r2)}` : null,
    model.samples ? `học từ ${model.samples} mẫu` : null,
  ].filter(Boolean);
  return parts.length ? `${parts.join(' · ')} (node tự tính).` : 'Node chưa gửi sai số của công thức.';
}

/** So hệ số với công thức chung: "H 0,985 → 0,968 · V 4,8 → 6,1". */
function describeChanges(base: StationModel, model: StationModel): string {
  const names = sortModelVariables([...new Set([...Object.keys(base.coefficients), ...Object.keys(model.coefficients)])]);
  const changed = names
    .filter((name) => base.coefficients[name] !== model.coefficients[name])
    .map((name) => `${name} ${formatModelNumber(base.coefficients[name] ?? 0)} → ${formatModelNumber(model.coefficients[name] ?? 0)}`);
  return changed.length ? `So với v1: ${changed.join(' · ')}` : 'Hệ số giống v1';
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
