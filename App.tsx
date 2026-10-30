import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { InteractionManager, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

// 按字重直引 .ttf：包根 index.js 会 require 整包字重，Metro 不做摇树，
// 从包根导入会把两个包全部 20 个字重（约 53MB）都打进 App。
import IBMPlexMono_400Regular from '@expo-google-fonts/ibm-plex-mono/IBMPlexMono_400Regular.ttf';
import IBMPlexMono_500Medium from '@expo-google-fonts/ibm-plex-mono/IBMPlexMono_500Medium.ttf';
import IBMPlexMono_600SemiBold from '@expo-google-fonts/ibm-plex-mono/IBMPlexMono_600SemiBold.ttf';
import NotoSansSC_400Regular from '@expo-google-fonts/noto-sans-sc/NotoSansSC_400Regular.ttf';
import NotoSansSC_500Medium from '@expo-google-fonts/noto-sans-sc/NotoSansSC_500Medium.ttf';
import NotoSansSC_700Bold from '@expo-google-fonts/noto-sans-sc/NotoSansSC_700Bold.ttf';

import { TabBar, type TabKey } from './src/components/TabBar';
import { ConfirmProvider } from './src/components/Confirm';
import { ExpenseSheet } from './src/components/ExpenseSheet';
import { PressableScale } from './src/components/Motion';
import { DashedRule } from './src/components/Rule';
import { ToastProvider } from './src/components/Toast';
import { AssetsScreen } from './src/screens/AssetsScreen';
import { ExpensesScreen } from './src/screens/ExpensesScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { MeScreen } from './src/screens/MeScreen';
import { RatesScreen } from './src/screens/RatesScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { AppProvider, useApp } from './src/state/AppContext';
import { ThemeProvider, useTheme, useThemedStyles, type ThemeMode } from './src/state/ThemeContext';
import * as repo from './src/data/repo';
import { fontFamily, light, numerals, radius, spacing, type as t, type Palette } from './src/theme';

/** 出纸前的空白凭条：这会儿字体 / 外观偏好还没就绪，只能拿日间纸色垫着 */
const bootStyles = StyleSheet.create({
  boot: { flex: 1, backgroundColor: light.paper },
});

export default function App() {
  // 字体加载完再渲染，避免先出系统字体再闪回。未加载时留一张空白凭条纸。
  const [loaded] = useFonts({
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
    NotoSansSC_400Regular,
    NotoSansSC_500Medium,
    NotoSansSC_700Bold,
  });

  // 外观偏好与字体同过一道门：都就绪才出纸，夜间用户不会先闪一张白凭条。
  // 库打不开时按日间渲染 —— 数据侧随后自会落到 BootError 兜底页。
  const [themeMode, setThemeMode] = useState<ThemeMode | null>(null);
  useEffect(() => {
    let alive = true;
    repo
      .getThemeMode()
      .then((m) => {
        if (alive) setThemeMode(m);
      })
      .catch(() => {
        if (alive) setThemeMode('light');
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!loaded || themeMode == null) {
    return <View style={bootStyles.boot} />;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider initialMode={themeMode}>
        <Root />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/** 状态栏 + 全局 Provider 的壳：状态栏颜色随外观走，必须在 ThemeProvider 里。 */
function Root() {
  const { mode, colors } = useTheme();
  return (
    <>
      {/* expo-status-bar 默认 translucent=true 会挂半透明黑纱，凭条纸要的是实心纸色状态栏 */}
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} translucent={false} backgroundColor={colors.paper} />
      <AppProvider>
        <ToastProvider>
          <ConfirmProvider>
            <Shell />
          </ConfirmProvider>
        </ToastProvider>
      </AppProvider>
    </>
  );
}

/** 底部导航 + 页面切换 + 记支出弹层 + 汇率子页。 */
function Shell() {
  const styles = useThemedStyles(createStyles);
  const [tab, setTab] = useState<TabKey>('home');
  // 页面一旦看过就保活：切 tab 只是藏显，不卸载重建（否则每次切页都要
  // 在 JS 里重造几百个视图，主线程停 200-700ms，表现为明显卡一下）。
  const [shown, setShown] = useState<Record<TabKey, boolean>>({
    home: true,
    assets: false,
    stats: false,
    me: false,
  });
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [ratesOpen, setRatesOpen] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const { loading, error } = useApp();

  const changeTab = (k: TabKey) => {
    setTab(k);
    setShown((prev) => (prev[k] ? prev : { ...prev, [k]: true }));
  };

  // 「我的」进汇率子页、「总览」进流水查询的入口回调：引用恒定，保住四页元素的 memo（见下）
  const openRates = useCallback(() => setRatesOpen(true), []);
  const openExpenses = useCallback(() => setLedgerOpen(true), []);

  // 四页的元素引用保持稳定（只在首次挂载那页时变化）：切 tab、开关记一笔弹层
  // 这类 Shell 级重渲染里，页面子树因元素引用未变被 React 整体跳过 ——
  // 否则每次切换都要在 JS 里重新和解几百个视图节点，这是切页剩余延迟的大头。
  const homeStage = useMemo(() => (shown.home ? <HomeScreen /> : null), [shown.home]);
  const assetsStage = useMemo(() => (shown.assets ? <AssetsScreen /> : null), [shown.assets]);
  const statsStage = useMemo(
    () => (shown.stats ? <StatsScreen onOpenExpenses={openExpenses} /> : null),
    [shown.stats, openExpenses],
  );
  const meStage = useMemo(
    () => (shown.me ? <MeScreen onOpenRates={openRates} /> : null),
    [shown.me, openRates],
  );

  // 预热：账本就绪后，趁用户还在看首页，把其余三页逐页挂掉（InteractionManager
  // 排队，滑动手势没停就先不挂）。之后任何时候切 tab 都只剩藏显，不再有首挂成本。
  useEffect(() => {
    if (loading || error) return;
    let cancelled = false;
    const warm = (rest: TabKey[]) => {
      const [k, ...tail] = rest;
      if (!k || cancelled) return;
      InteractionManager.runAfterInteractions(() => {
        if (cancelled) return;
        setShown((prev) => (prev[k] ? prev : { ...prev, [k]: true }));
        // 下一页等这页挂完再排（runAfterInteractions 队列空时会立刻触发，串起来才不会挤成一帧）
        setTimeout(() => warm(tail), 300);
      });
    };
    warm(['assets', 'stats', 'me']);
    return () => {
      cancelled = true;
    };
  }, [loading, error]);

  if (loading) {
    return (
      <View style={styles.root}>
        <LedgerSkeleton />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.root}>
        <BootError message={error} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* 页面区占住 TabBar 以上的空间；四页在里面绝对定位叠放 */}
      <View style={styles.pages}>
        <Stage active={tab === 'home'}>{homeStage}</Stage>
        <Stage active={tab === 'assets'}>{assetsStage}</Stage>
        <Stage active={tab === 'stats'}>{statsStage}</Stage>
        <Stage active={tab === 'me'}>{meStage}</Stage>
      </View>

      <TabBar active={tab} onChange={changeTab} onAdd={() => setExpenseOpen(true)} />
      <ExpenseSheet visible={expenseOpen} onClose={() => setExpenseOpen(false)} />
      {/* 汇率与币种 / 支出流水两个子页：整页钉在导航之上 */}
      <RatesScreen visible={ratesOpen} onClose={() => setRatesOpen(false)} />
      <ExpensesScreen visible={ledgerOpen} onClose={() => setLedgerOpen(false)} />
    </View>
  );
}

/** 一个页面槽：四页常驻叠放，非当前 tab 用 opacity:0 藏住。
 *  不用 display:none —— 那样每次切回都要整页重新 Yoga 布局（实测长帧 150-250ms），
 *  叠放 + 透明度切换只是改一个样式值，布局缓存原地不动。
 *  槽本身不含颜色，样式与主题无关，做成静态一份。 */
const stageStyles = StyleSheet.create({
  stage: { ...StyleSheet.absoluteFillObject },
  stageOff: { opacity: 0 },
});

function Stage({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <View style={[stageStyles.stage, !active && stageStyles.stageOff]} pointerEvents={active ? 'auto' : 'none'}>
      {children}
    </View>
  );
}

/**
 * 载入骨架：一张正在打印中的凭条 —— 虚线分段 + 浅色占位条 + 主数字条。
 * 不闪、不循环，只是先摆出最终版式，让首帧不跳。
 */
function LedgerSkeleton() {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      contentContainerStyle={[styles.skelScroll, { paddingTop: insets.top + spacing(1) }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.skelSerial} />
      <View style={styles.skelBrand} />
      <DashedRule />
      <View style={styles.skelHero} />
      <View style={styles.skelLine}>
        <View style={[styles.skelBar, styles.skelWide]} />
        <View style={styles.skelLead}>
          <DashedRule />
        </View>
        <View style={[styles.skelBar, styles.skelNum]} />
      </View>
      <View style={styles.skelLine}>
        <View style={[styles.skelBar, styles.skelMid]} />
        <View style={styles.skelLead}>
          <DashedRule />
        </View>
        <View style={[styles.skelBar, styles.skelNum]} />
      </View>
      <DashedRule style={styles.skelRule} />
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={styles.skelLine}>
          <View style={[styles.skelBar, styles.skelWide]} />
          <View style={styles.skelLead}>
            <DashedRule />
          </View>
          <View style={[styles.skelBar, styles.skelNum]} />
        </View>
      ))}
      <Text style={styles.skelCaption}>载入中 · LOADING</Text>
    </ScrollView>
  );
}

/** 开库失败兜底：说清原因，给一次重试。 */
function BootError({ message }: { message: string }) {
  const styles = useThemedStyles(createStyles);
  const { retry } = useApp();
  return (
    <View style={styles.errWrap}>
      <Text style={styles.errTitle}>账本打不开</Text>
      <DashedRule style={styles.errRule} />
      <Text style={styles.errText}>
        本地数据库没能就绪。数据仍在这台设备上，重试通常就能恢复。
      </Text>
      <Text style={styles.errDetail}>{message}</Text>
      <PressableScale onPress={() => void retry()} style={styles.errBtn} pressOpacity={0.86}>
        <Text style={styles.errBtnText}>重试</Text>
      </PressableScale>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.paper },
    pages: { flex: 1 },

    skelScroll: {
      paddingHorizontal: spacing(6),
      paddingBottom: spacing(10),
    },
    skelSerial: {
      alignSelf: 'flex-end',
      width: 64,
      height: 10,
      marginTop: spacing(1),
      backgroundColor: colors.dashSoft,
      borderRadius: 2,
    },
    skelBrand: {
      alignSelf: 'center',
      width: 132,
      height: 17,
      marginTop: spacing(4),
      marginBottom: spacing(6),
      backgroundColor: colors.dashSoft,
      borderRadius: 2,
    },
    skelHero: {
      alignSelf: 'center',
      width: 236,
      height: 44,
      marginTop: spacing(6),
      marginBottom: spacing(5),
      backgroundColor: colors.dashSoft,
      borderRadius: radius.seal,
    },
    skelRule: {
      marginTop: spacing(4),
      marginBottom: spacing(2),
    },
    skelLine: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing(2.5),
    },
    skelBar: {
      height: 12,
      backgroundColor: colors.dashSoft,
      borderRadius: 2,
    },
    skelWide: { width: '38%' },
    skelMid: { width: '26%' },
    skelNum: { width: 58 },
    skelLead: {
      flex: 1,
      marginHorizontal: spacing(2),
    },
    skelCaption: {
      fontFamily: fontFamily.mono,
      fontSize: t.small,
      letterSpacing: 3,
      color: colors.dimInk,
      textAlign: 'center',
      marginTop: spacing(10),
      ...numerals,
    },

    errWrap: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing(8),
    },
    errTitle: {
      fontFamily: fontFamily.sansBold,
      fontSize: 18,
      letterSpacing: 3,
      color: colors.ink,
      textAlign: 'center',
    },
    errRule: {
      marginVertical: spacing(4),
    },
    errText: {
      fontFamily: fontFamily.sans,
      fontSize: t.body,
      lineHeight: t.body * 1.7,
      color: colors.ink,
    },
    errDetail: {
      fontFamily: fontFamily.mono,
      fontSize: t.tiny,
      lineHeight: t.tiny * 1.8,
      color: colors.dimInk,
      marginTop: spacing(3),
    },
    errBtn: {
      alignSelf: 'center',
      marginTop: spacing(8),
      backgroundColor: colors.ink,
      borderRadius: radius.ring,
      minWidth: 160,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errBtnText: {
      fontFamily: fontFamily.sansBold,
      fontSize: t.h2,
      letterSpacing: 4,
      color: colors.onInk,
    },
  });
