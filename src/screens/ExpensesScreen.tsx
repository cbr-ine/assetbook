import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react-native';

import { toCny } from '../data/sample';
import type { Expense } from '../data/types';
import { useApp } from '../state/AppContext';
import { useTheme, useThemedStyles } from '../state/ThemeContext';
import { CalendarSheet } from '../components/CalendarSheet';
import { ExpenseSheet } from '../components/ExpenseSheet';
import { PressableScale } from '../components/Motion';
import { DashedRule, DotLeader, SectionLabel } from '../components/Rule';
import { useConfirm } from '../components/Confirm';
import {
  currencySymbol,
  formatFixed,
  formatNumber,
  formatRelativeDay,
} from '../utils/format';
import { fontFamily, motion, numerals, radius, spacing, type as t, type Palette } from '../theme';

const H_PADDING = spacing(6);

const DAY = 24 * 60 * 60 * 1000;

/** 本地日期串（YYYY-MM-DD）；流水里存的本地 ISO 前 10 位就是它 */
function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 中文日期（2026年10月30日）：数字连排不断开，等宽字体 + 连字符的 ISO 串看着太散 */
function zhDate(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 规整年月日：月份可越界（13 月 = 次年 1 月），日钳在当月天数内 */
function normDate(y: number, m: number, d: number): Date {
  const base = new Date(y, m - 1, 1);
  const dim = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  return new Date(base.getFullYear(), base.getMonth(), Math.min(Math.max(d, 1), dim));
}

/**
 * 支出流水查询子页：选「从哪天到哪天」，区间内的支出一条条列出来，
 * 可就地改（点行）或删（行尾 / 长按），合计与笔数实时算。
 * 从首页「按日期查询」进入，盖住底部导航；返回键 / 左上角返回。
 */
export function ExpensesScreen({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { expenses, assets, rates, deleteExpense } = useApp();
  const { confirm } = useConfirm();
  const [editing, setEditing] = useState<Expense | null>(null);
  /** 正在弹日历的是哪一端 */
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);
  /** 出没出账：进页先只摆区间选择，点了「查询」或快捷胶囊才列明细 */
  const [queried, setQueried] = useState(false);

  // 进退场（RatesScreen 同款）
  const [mounted, setMounted] = useState(visible);
  const prog = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      setMounted(true);
      const a = Animated.timing(prog, {
        toValue: 1,
        duration: motion.base,
        easing: motion.easing,
        useNativeDriver: true,
      });
      a.start();
      return () => a.stop();
    }
    const a = Animated.timing(prog, {
      toValue: 0,
      duration: motion.fast,
      easing: motion.easing,
      useNativeDriver: true,
    });
    a.start(({ finished }) => {
      if (finished) setMounted(false);
    });
    return () => a.stop();
  }, [visible, prog]);

  // Android 返回键只在子页可见时接管
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  // 查询区间：默认近 30 天（含今天）
  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(() => normDate(today.getFullYear(), today.getMonth() + 1, today.getDate() - 29));
  const [to, setTo] = useState(() => normDate(today.getFullYear(), today.getMonth() + 1, today.getDate()));

  const a = dayKey(from);
  const b = dayKey(to);
  const [lo, hi] = a <= b ? [a, b] : [b, a];

  const items = useMemo(
    () =>
      expenses
        .filter((e) => {
          const k = e.date.slice(0, 10);
          return k >= lo && k <= hi;
        })
        .sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : 0)),
    [expenses, lo, hi],
  );

  const totalCny = useMemo(
    () => items.reduce((s, e) => s + toCny(e.amount, e.currency, rates), 0),
    [items, rates],
  );

  const nameOf = (id: string) => assets.find((x) => x.id === id)?.name ?? '未知账户';

  const confirmDelete = (e: Expense) => {
    void confirm({
      title: '删除这笔支出',
      message: `「${e.note}」${currencySymbol(e.currency)}${formatFixed(e.amount)}\n金额会加回「${nameOf(e.accountId)}」。`,
      confirmText: '删除',
      destructive: true,
    }).then((ok) => {
      if (ok) deleteExpense(e.id);
    });
  };

  /** 快捷区间：把两端一起设好，直接出账 */
  const setQuick = (kind: '7d' | '30d' | 'month' | 'year') => {
    const n = new Date();
    const today = normDate(n.getFullYear(), n.getMonth() + 1, n.getDate());
    setTo(today);
    if (kind === '7d') setFrom(normDate(n.getFullYear(), n.getMonth() + 1, n.getDate() - 6));
    else if (kind === '30d') setFrom(normDate(n.getFullYear(), n.getMonth() + 1, n.getDate() - 29));
    else if (kind === 'month') setFrom(new Date(n.getFullYear(), n.getMonth(), 1));
    else setFrom(new Date(n.getFullYear(), 0, 1));
    setQueried(true);
  };

  if (!mounted) return null;

  const cny = currencySymbol('CNY');

  return (
    <Animated.View
      style={[
        styles.root,
        {
          opacity: prog,
          transform: [
            { translateX: prog.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
          ],
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing(2), paddingBottom: spacing(10) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          <PressableScale onPress={onClose} style={styles.back} pressTint accessibilityLabel="返回总览">
            <ChevronLeft size={22} color={colors.ink} strokeWidth={1.8} />
          </PressableScale>
          <View style={styles.headCenter}>
            <Text style={styles.brandName}>支出流水</Text>
            <Text style={styles.brandSub}>EXPENSE LEDGER</Text>
          </View>
          <View style={styles.back} />
        </View>

        <DashedRule />

        <SectionLabel latin="RANGE" cn="日期区间" />
        <View style={styles.quickRow}>
          {([
            ['7d', '近 7 天'],
            ['30d', '近 30 天'],
            ['month', '本月'],
            ['year', '今年'],
          ] as const).map(([kind, label]) => (
            <PressableScale key={kind} onPress={() => setQuick(kind)} style={styles.quickChip} pressTint accessibilityLabel={label}>
              <Text style={styles.quickText}>{label}</Text>
            </PressableScale>
          ))}
        </View>
        <DateRow label="从 FROM" text={zhDate(from)} onPress={() => setPicking('from')} />
        <DateRow label="到 TO" text={zhDate(to)} onPress={() => setPicking('to')} />

        {!queried ? (
          <>
            <PressableScale
              onPress={() => setQueried(true)}
              style={styles.queryBtn}
              pressOpacity={0.86}
              accessibilityLabel="查询"
            >
              <Text style={styles.queryText}>查询 · QUERY</Text>
            </PressableScale>
            <Text style={styles.hint}>定好两端日期点「查询」出账，或直接用上面的快捷区间</Text>
          </>
        ) : (
          <>
            <View style={styles.sum}>
              <DashedRule style={styles.sumRule} />
              <View style={styles.line}>
                <Text style={styles.lineLabel}>合计 TOTAL</Text>
                <DotLeader />
                <Text style={[styles.lineValue, styles.big]}>{cny}{formatNumber(Math.round(totalCny))}</Text>
              </View>
              <View style={styles.line}>
                <Text style={styles.lineLabel}>笔数 COUNT</Text>
                <DotLeader />
                <Text style={styles.lineValue}>{items.length}</Text>
              </View>
            </View>

            <SectionLabel latin="DETAIL" cn="明细" />
            {items.length === 0 ? (
              <Text style={styles.empty}>这个区间内没有支出，换个日期试试</Text>
            ) : (
              items.map((e) => (
                <View key={e.id} style={styles.row}>
                  <PressableScale
                    style={styles.rowMain}
                    pressTint
                    onPress={() => setEditing(e)}
                    accessibilityLabel={`${e.note}，点按修改`}
                  >
                    <Text style={styles.note} numberOfLines={1}>
                      {e.note}
                    </Text>
                    <Text style={styles.sub}>
                      {nameOf(e.accountId)}　{formatRelativeDay(e.date)}
                    </Text>
                  </PressableScale>
                  <DotLeader />
                  <Text style={styles.lineValue}>
                    −{currencySymbol(e.currency)}{formatFixed(e.amount)}
                  </Text>
                  <PressableScale
                    onPress={() => confirmDelete(e)}
                    style={styles.trash}
                    pressTint
                    accessibilityLabel={`删除${e.note}`}
                  >
                    <Trash2 size={16} color={colors.stamp} strokeWidth={1.7} />
                  </PressableScale>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      <ExpenseSheet visible={editing !== null} edit={editing} onClose={() => setEditing(null)} />

      <CalendarSheet
        visible={picking === 'from'}
        onClose={() => setPicking(null)}
        title="开始日期"
        value={from}
        range={{ lo, hi }}
        onSelect={setFrom}
      />
      <CalendarSheet
        visible={picking === 'to'}
        onClose={() => setPicking(null)}
        title="结束日期"
        value={to}
        range={{ lo, hi }}
        onSelect={setTo}
      />
    </Animated.View>
  );
}

/** 一行日期：从/到 + 当前日期 + 日历记号，点整行弹日历直接选 */
function DateRow({ label, text, onPress }: { label: string; text: string; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <PressableScale onPress={onPress} style={styles.dateRow} pressTint accessibilityLabel={`选择${label}`}>
      <Text style={styles.dateLabel}>{label}</Text>
      <DotLeader />
      <Text style={styles.dateText}>{text}</Text>
      <Calendar size={15} color={colors.dimInk} strokeWidth={1.7} />
    </PressableScale>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    /** 整页覆盖层：钉满四角、纸色垫底，盖在底部导航之上 */
    root: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.paper,
    },
    scroll: {
      paddingHorizontal: H_PADDING,
    },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: spacing(2),
      paddingBottom: spacing(4),
    },
    back: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 6,
    },
    headCenter: {
      flex: 1,
      alignItems: 'center',
    },
    brandName: {
      fontFamily: fontFamily.sansBold,
      fontSize: 17,
      letterSpacing: 4,
      color: colors.ink,
    },
    brandSub: {
      fontFamily: fontFamily.mono,
      fontSize: t.tiny,
      letterSpacing: 3,
      color: colors.dimInk,
      marginTop: spacing(2),
    },
    quickRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing(2),
      marginBottom: spacing(3),
    },
    quickChip: {
      borderWidth: 1,
      borderColor: colors.dash,
      borderRadius: radius.ring,
      paddingHorizontal: spacing(3.5),
      minHeight: 36,
      justifyContent: 'center',
    },
    quickText: {
      fontFamily: fontFamily.mono,
      fontSize: t.small,
      letterSpacing: 1,
      color: colors.ink,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing(2),
      minHeight: 44,
      paddingVertical: spacing(0.5),
      borderRadius: 6,
    },
    dateLabel: {
      fontFamily: fontFamily.mono,
      fontSize: t.small,
      letterSpacing: 1,
      color: colors.dimInk,
    },
    dateText: {
      fontFamily: fontFamily.monoMed,
      fontSize: 15,
      color: colors.ink,
    },
    /** 查询键：与「存下」「记下这笔」同一实心键语言 */
    queryBtn: {
      backgroundColor: colors.ink,
      borderRadius: radius.ring,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
      marginTop: spacing(4),
    },
    queryText: {
      fontFamily: fontFamily.monoMed,
      fontSize: 15,
      letterSpacing: 1,
      color: colors.onInk,
    },
    hint: {
      fontFamily: fontFamily.sans,
      fontSize: t.small,
      lineHeight: t.small * 1.7,
      color: colors.dimInk,
      textAlign: 'center',
      marginTop: spacing(3),
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
    empty: {
      fontFamily: fontFamily.sans,
      fontSize: t.body,
      color: colors.dimInk,
      textAlign: 'center',
      paddingVertical: spacing(3),
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 44,
      paddingVertical: spacing(1),
    },
    rowMain: {
      maxWidth: '46%',
    },
    note: {
      fontFamily: fontFamily.sans,
      fontSize: t.body,
      color: colors.ink,
    },
    sub: {
      fontFamily: fontFamily.mono,
      fontSize: t.tiny,
      color: colors.dimInk,
      letterSpacing: 0.3,
      marginTop: spacing(0.5),
    },
    trash: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: spacing(3),
      marginRight: -spacing(2.5),
      borderRadius: 6,
    },
  });
