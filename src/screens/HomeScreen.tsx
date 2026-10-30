import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Coins, PencilLine, RefreshCw, type LucideIcon } from 'lucide-react-native';

import { ExpenseTrendCard } from '../components/ExpenseTrendCard';
import { EnterView } from '../components/Motion';
import { NetWorthHero } from '../components/NetWorthHero';
import { DashedRule, SectionLabel } from '../components/Rule';
import { fontFamily, spacing, type as t, type Palette } from '../theme';
import { useTheme, useThemedStyles } from '../state/ThemeContext';
import { useApp } from '../state/AppContext';

const H_PADDING = spacing(6);

/**
 * 主页（总览）。视觉母题：一张刚打出来的对账单。
 * 头（户名 + 凭条编号）→ 净资产（等宽大字）→ 支出趋势 → 尾（时间戳）。
 * 支出明细不在本页（统计页与「按日期查询」子页承接），保持页面整洁。
 * 账本还空着的时候，中间换成三步引导。
 */
export function HomeScreen() {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { summary, dailySpend, expenses, assets } = useApp();

  const trendTotal = useMemo(() => dailySpend.reduce((s, v) => s + v, 0), [dailySpend]);
  const emptyLedger = assets.length === 0 && expenses.length === 0;
  const stamp = useMemo(() => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }, []);

  return (
    <EnterView style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing(1), paddingBottom: spacing(10) }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.serial}>NO.0001</Text>

        <View style={styles.brand}>
          <Text style={styles.brandName}>资产账本</Text>
          <Text style={styles.brandSub}>ASSET STATEMENT</Text>
        </View>

        <DashedRule style={styles.headRule} />

        {emptyLedger ? (
          <FirstRunGuide />
        ) : (
          <>
            <NetWorthHero summary={summary} />
            <ExpenseTrendCard dailyValues={dailySpend} total={trendTotal} rangeLabel="近 14 天" />
          </>
        )}

        <View style={styles.footer}>
          <Text style={styles.footLine}>{stamp}</Text>
        </View>
      </ScrollView>
    </EnterView>
  );
}

/** 空账本引导：三步，顺着底部导航从左到右说一遍。 */
function FirstRunGuide() {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.guide}>
      <SectionLabel latin="GET STARTED" cn="账本还是空的" />

      <View style={styles.steps}>
        <Step Icon={Coins} text="在「资产」页记下账户、借出款与实物，净资产会自动合出来。" />
        <Step Icon={PencilLine} text="点下面的圆键记一笔支出，金额会从对应账户里扣掉。" />
        <Step Icon={RefreshCw} text="在「我的 → 汇率与币种」里联网更新汇率，外币资产自动折算成人民币。" />
      </View>

      <DashedRule style={styles.guideRule} />
      <Text style={styles.guideFoot}>数据只保存在这台设备上，不上传、不需要账号。</Text>
    </View>
  );
}

function Step({ Icon, text }: { Icon: LucideIcon; text: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.step}>
      <Icon size={18} color={colors.dimInk} strokeWidth={1.6} />
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  scroll: {
    paddingHorizontal: H_PADDING,
  },
  serial: {
    fontFamily: fontFamily.mono,
    fontSize: t.label,
    letterSpacing: 3,
    color: colors.dim, // 装饰性编号，保留褪色感
    textAlign: 'right',
  },
  brand: {
    alignItems: 'center',
    paddingTop: spacing(2),
    paddingBottom: spacing(4),
  },
  brandName: {
    fontFamily: fontFamily.sansBold,
    fontSize: 17,
    letterSpacing: 6,
    color: colors.ink,
  },
  brandSub: {
    fontFamily: fontFamily.mono,
    fontSize: t.tiny,
    letterSpacing: 3,
    color: colors.dimInk,
    marginTop: spacing(2),
  },
  headRule: {
    marginBottom: spacing(1),
  },
  guide: {
    paddingTop: spacing(6),
  },
  steps: {
    marginTop: spacing(3),
    gap: spacing(4),
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing(3),
    minHeight: 44,
  },
  stepText: {
    flex: 1,
    fontFamily: fontFamily.sans,
    fontSize: t.body,
    lineHeight: t.body * 1.6,
    color: colors.ink,
  },
  guideRule: {
    marginTop: spacing(7),
  },
  guideFoot: {
    fontFamily: fontFamily.mono,
    fontSize: t.small,
    lineHeight: t.small * 1.7,
    color: colors.dimInk,
    marginTop: spacing(3),
  },
  footer: {
    alignItems: 'center',
    paddingTop: spacing(8),
    gap: spacing(1.5),
  },
  footLine: {
    fontFamily: fontFamily.mono,
    fontSize: t.tiny,
    letterSpacing: 1.5,
    color: colors.dim, // 装饰性结算语
  },
});
