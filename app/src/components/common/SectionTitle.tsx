import type { ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';

import { appColors } from '@/constants/appColors';

/** TIÊU ĐỀ của một nhóm thông tin trong thẻ. */
export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '800', color: appColors.text, marginBottom: 10 },
});
