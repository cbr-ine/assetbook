import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fontFamily, numerals, spacing, type as t, type Palette } from '../theme';
import { useThemedStyles } from '../state/ThemeContext';
import { currencySymbol, formatNumber } from '../utils/format';
import type { NetWorthSummary } from '../data/types';
import { RollingNumber } from './RollingNumber';
import { DotLeader, DashedRule } from './Rule';

interface Props {
  summary: NetWorthSummary;
}

/**
 * 页面记忆点：净资产居中的等宽大字，
 * 下面按凭条排法用点线把「名目 …… 金额」连成两行。
 * 金额逐位滚动（只有变了的位数会动）；金额长了自动降一号字，避免超出纸宽。
 */
export function NetWorthHero({ summary }: Props) {
  const styles = useThemedStyles(createStyles);
  const text = formatNumber(summary.net);
  // 位数多时降字号：40 → 32 → 26，行高始终跟着字号走
  const fontSize = text.length > 12 ? 26 : text.length > 10 ? 32 : t.total;
  const lineHeight = Math.round(fontSize * 1.15);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>NET WORTH 净资产</Text>

      <View style={styles.totalRow}>
        <Text
          style={[styles.cur, { fontSize: Math.round(fontSize * 0.72), lineHeight }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {currencySymbol(summary.baseCurrency)}
        </Text>
        <RollingNumber
          text={text}
          cellHeight={lineHeight}
          style={[styles.total, { fontSize, lineHeight }]}
        />
      </View>

      <DashedRule style={styles.linesRule} />

      <View style={styles.lines}>
        <Line label="可流动现金等值物" value={formatNumber(summary.liquid)} />
        <Line label="固定资产与实物" value={formatNumber(summary.fixed)} />
      </View>
    </View>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <DotLeader />
      <Text style={styles.lineValue}>{value}</Text>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
  wrap: {
    position: 'relative',
    alignItems: 'center',
    paddingTop: spacing(4),
  },
  label: {
    fontFamily: fontFamily.mono,
    fontSize: t.label,
    letterSpacing: 3,
    color: colors.dimInk,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: spacing(2),
  },
  total: {
    fontFamily: fontFamily.monoSemi,
    color: colors.ink,
    letterSpacing: -0.5,
    ...numerals,
  },
  cur: {
    fontFamily: fontFamily.monoMed,
    color: colors.ink,
  },
  lines: {
    alignSelf: 'stretch',
  },
  linesRule: {
    alignSelf: 'stretch',
    marginTop: spacing(4.5),
  },
  line: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingVertical: spacing(2.5),
  },
  lineLabel: {
    fontFamily: fontFamily.sans,
    fontSize: t.small,
    color: colors.ink,
  },
  lineValue: {
    fontFamily: fontFamily.monoMed,
    fontSize: 17,
    color: colors.ink,
    ...numerals,
  },
});
