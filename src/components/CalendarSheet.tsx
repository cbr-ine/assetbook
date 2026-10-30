import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';

import { PressableScale } from './Motion';
import { DashedRule } from './Rule';
import { Sheet } from './Sheet';
import { useTheme, useThemedStyles } from '../state/ThemeContext';
import { fontFamily, numerals, spacing, type as t, type Palette } from '../theme';

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
const MONTH_LATIN = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
];

function dayKeyOf(y: number, m: number, d: number): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${y}-${p(m + 1)}-${p(d)}`;
}

/**
 * 凭条风日历弹层：月份 ‹ › 翻页，直接点某天。
 * value 是当前选中的那天（印成实心章）；range 染出区间内的日子。
 * 点中即回调并收起 —— 与「选完就走」的拨号习惯一致。
 */
export function CalendarSheet({
  visible,
  onClose,
  title,
  value,
  range,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  /** 弹层标题（开始日期 / 结束日期） */
  title: string;
  /** 该字段当前的日期 */
  value: Date;
  /** 区间两端（含），用于把夹在中间的日子染上浅底 */
  range: { lo: string; hi: string };
  onSelect: (day: Date) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  // 打开时把月份翻到当前值所在月
  const [cursor, setCursor] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  useEffect(() => {
    if (visible) setCursor(new Date(value.getFullYear(), value.getMonth(), 1));
  }, [visible, value]);

  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const dim = new Date(y, m + 1, 0).getDate();
  const lead = new Date(y, m, 1).getDay();
  const cells: (number | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: dim }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const valueKey = dayKeyOf(value.getFullYear(), value.getMonth(), value.getDate());

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.head}>
        <PressableScale onPress={onClose} style={styles.iconBtn} accessibilityLabel="关闭">
          <X size={22} color={colors.ink} strokeWidth={1.7} />
        </PressableScale>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.iconBtn} />
      </View>
      <DashedRule />

      <View style={styles.monthRow}>
        <PressableScale
          onPress={() => setCursor(new Date(y, m - 1, 1))}
          style={styles.navBtn}
          pressTint
          accessibilityLabel="上个月"
        >
          <ChevronLeft size={18} color={colors.ink} strokeWidth={1.8} />
        </PressableScale>
        <Text style={styles.monthLabel}>
          {y}年{m + 1}月 · {MONTH_LATIN[m]}
        </Text>
        <PressableScale
          onPress={() => setCursor(new Date(y, m + 1, 1))}
          style={styles.navBtn}
          pressTint
          accessibilityLabel="下个月"
        >
          <ChevronRight size={18} color={colors.ink} strokeWidth={1.8} />
        </PressableScale>
      </View>

      <View style={styles.weekRow}>
        {WEEK.map((w) => (
          <Text key={w} style={styles.weekText}>
            {w}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((d, i) => {
          if (d == null) return <View key={i} style={styles.cell} />;
          const key = dayKeyOf(y, m, d);
          const selected = key === valueKey;
          const inRange = !selected && key >= range.lo && key <= range.hi;
          return (
            <PressableScale
              key={i}
              onPress={() => {
                onSelect(new Date(y, m, d));
                onClose();
              }}
              style={[styles.cell, inRange && styles.cellRange, selected && styles.cellOn]}
              pressTint={!selected && !inRange}
              accessibilityLabel={`${m + 1}月${d}日`}
            >
              <Text style={[styles.cellText, selected && styles.cellTextOn]}>{d}</Text>
            </PressableScale>
          );
        })}
      </View>
    </Sheet>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing(1),
      paddingHorizontal: spacing(4),
    },
    iconBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 6,
    },
    title: {
      fontFamily: fontFamily.sansBold,
      fontSize: 16,
      letterSpacing: 2,
      color: colors.ink,
    },
    monthRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing(6),
      paddingTop: spacing(3),
      paddingBottom: spacing(2),
    },
    navBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 6,
    },
    monthLabel: {
      fontFamily: fontFamily.monoMed,
      fontSize: t.small,
      letterSpacing: 1,
      color: colors.ink,
    },
    weekRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing(4),
      paddingBottom: spacing(1),
    },
    weekText: {
      flex: 1,
      textAlign: 'center',
      fontFamily: fontFamily.mono,
      fontSize: t.tiny,
      letterSpacing: 1,
      color: colors.dim,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: spacing(4),
      paddingBottom: spacing(6),
    },
    cell: {
      width: '14.2857%',
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cellRange: {
      backgroundColor: colors.press,
    },
    cellOn: {
      backgroundColor: colors.ink,
    },
    cellText: {
      fontFamily: fontFamily.monoMed,
      fontSize: t.small,
      color: colors.ink,
      ...numerals,
    },
    cellTextOn: {
      color: colors.onInk,
    },
  });
