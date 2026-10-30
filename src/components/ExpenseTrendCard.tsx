import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { fontFamily, numerals, spacing, type as t, type Palette } from '../theme';
import { useThemedStyles } from '../state/ThemeContext';
import { formatFixed } from '../utils/format';
import { Bars } from './Bars';
import { DashedRule, DotLeader, SectionLabel } from './Rule';

const PADDING = spacing(6);
const CHART_HEIGHT = 64;

interface Props {
  /** 每日支出金额，按时间正序 */
  dailyValues: number[];
  /** 区间内支出合计 */
  total: number;
  rangeLabel?: string;
}

/**
 * 支出分区：一根分段虚线起头，中间一列热敏柱，收口两条点线账（合计 / 日均）。
 * 柱体从基线长上来；峰值那根用印字蓝黑加深，代替「环比上涨」之类的说明。
 */
export function ExpenseTrendCard({ dailyValues, total, rangeLabel = '近 14 天' }: Props) {
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const chartWidth = width - PADDING * 2;

  const days = dailyValues.length || 1;
  const avg = total / days;

  return (
    <View style={styles.section}>
      <SectionLabel latin="EXPENSE" cn={`支出 / ${rangeLabel}`} />

      <Bars
        values={dailyValues}
        width={chartWidth}
        height={CHART_HEIGHT}
        tooltip={(i) => {
          const d = new Date(Date.now() - (dailyValues.length - 1 - i) * 24 * 60 * 60 * 1000);
          return { label: `${d.getMonth() + 1}月${d.getDate()}日`, value: `¥${formatFixed(dailyValues[i])}` };
        }}
      />

      <View style={styles.sum}>
        <DashedRule style={styles.sumRule} />
        <View style={styles.line}>
          <Text style={styles.lineLabel}>合计 TOTAL</Text>
          <DotLeader />
          <Text style={[styles.lineValue, styles.big]}>{formatFixed(total)}</Text>
        </View>
        <View style={styles.line}>
          <Text style={styles.lineLabel}>日均 DAILY AVG</Text>
          <DotLeader />
          <Text style={styles.lineValue}>{formatFixed(Math.round(avg * 100) / 100)}</Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
  section: {
    marginTop: spacing(6),
  },
  sum: {
    marginTop: spacing(2),
  },
  sumRule: {
    marginBottom: spacing(1),
  },
  line: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingVertical: spacing(1.5),
  },
  lineLabel: {
    fontFamily: fontFamily.mono,
    fontSize: t.small,
    letterSpacing: 1,
    color: colors.dimInk,
  },
  lineValue: {
    fontFamily: fontFamily.monoMed,
    fontSize: 15,
    color: colors.ink,
    ...numerals,
  },
  big: {
    fontFamily: fontFamily.monoSemi,
    fontSize: 17,
  },
});
