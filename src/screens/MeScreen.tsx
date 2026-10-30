import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Download, Moon, Sun, Trash2, Upload, type LucideIcon } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { assertBackupPayload } from '../data/repo';
import { useApp } from '../state/AppContext';
import { useTheme, useThemedStyles, type ThemeMode } from '../state/ThemeContext';
import { useConfirm } from '../components/Confirm';
import { EnterView, PressableScale } from '../components/Motion';
import { FoldPicker } from '../components/FoldPicker';
import { DashedRule, DotLeader, SectionLabel } from '../components/Rule';
import { useToast } from '../components/Toast';
import { billingCycleEnd, billingCycleStart } from '../utils/format';
import { fontFamily, numerals, radius, spacing, type as t, type Palette } from '../theme';

const H_PADDING = spacing(6);

/** 外观两档：浅色冷白凭条 / 深色夜纸白墨 */
const APPEARANCES: { mode: ThemeMode; cn: string; latin: string; Icon: LucideIcon }[] = [
  { mode: 'light', cn: '浅色', latin: 'LIGHT', Icon: Sun },
  { mode: 'dark', cn: '深色', latin: 'DARK', Icon: Moon },
];

/**
 * 我的：外观（浅 / 深）、汇率与币种子页入口、数据导出导入、清空、关于。
 * 汇率表、联网更新、添加币种与基准币种都收进「汇率与币种」子页，本页只留一行入口。
 */
export function MeScreen({ onOpenRates }: { onOpenRates: () => void }) {
  const { colors, mode, setMode } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { rates, baseCurrency, exportBackup, importBackup, clearAll, billingDay, setBillingDay } = useApp();
  const toast = useToast();
  const { confirm } = useConfirm();
  /** 账期起始日选择器展开态 */
  const [cycleOpen, setCycleOpen] = useState(false);

  // 当前账期的两端（本地时区、含当天），随起始日选择即时重算
  const cycleStart = billingCycleStart(new Date(), billingDay);
  const cycleEnd = billingCycleEnd(cycleStart, billingDay);
  const md = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日`;

  /** 导出：整本账写成 JSON，落缓存后交给系统分享（存文件 / 传到微信都行）。 */
  const exportLedger = async () => {
    try {
      const payload = await exportBackup();
      const name = `assetbook-${payload.exportedAt.slice(0, 10)}.json`;
      const uri = `${FileSystem.cacheDirectory}${name}`;
      await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2), {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (!(await Sharing.isAvailableAsync())) {
        toast.show('这台设备不支持系统分享，导不出来');
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: '导出账本' });
    } catch {
      toast.show('导出失败，请重试');
    }
  };

  /** 导入：选一个备份文件，校验 + 确认后整本替换（换机搬回）。 */
  const importLedger = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const file = res.assets?.[0];
      if (!file) return;
      const text = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch {
        toast.show('文件读不出来：不是有效的 JSON，请确认是「导出账本」存下的文件');
        return;
      }
      const payload = assertBackupPayload(raw);
      const ok = await confirm({
        title: '导入这份账本',
        message:
          `导出于 ${payload.exportedAt.slice(0, 10)}\n` +
          `资产 ${payload.assets.length} 项 · 支出 ${payload.expenses.length} 笔\n` +
          '导入会整本替换当前数据。',
        confirmText: '整本替换',
        destructive: true,
      });
      if (!ok) return;
      await importBackup(payload);
      toast.show('账本已导入');
    } catch (err) {
      toast.show(err instanceof Error ? err.message : '导入失败，请检查文件');
    }
  };

  const confirmClear = () => {
    void confirm({
      title: '清空数据',
      message: '将删除所有资产、支出与汇率记录，且不可恢复。确定继续吗？',
      confirmText: '清空',
      destructive: true,
    }).then((ok) => {
      if (ok) void clearAll().then(() => toast.show('已清空，账本回到空白'));
    });
  };

  return (
    <EnterView style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing(2), paddingBottom: spacing(10) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          <Text style={styles.brandName}>我的</Text>
          <Text style={styles.brandSub}>SETTINGS</Text>
        </View>

        <DashedRule />

        <SectionLabel latin="APPEARANCE" cn="外观" />
        <View style={styles.chips}>
          {APPEARANCES.map(({ mode: m, cn, latin, Icon }) => {
            const on = m === mode;
            return (
              <PressableScale
                key={m}
                onPress={() => setMode(m)}
                style={[styles.chip, on && styles.chipOn]}
                pressTint
                accessibilityLabel={`外观：${cn}`}
              >
                <Icon size={13} color={on ? colors.onInk : colors.dimInk} strokeWidth={1.8} />
                <Text style={[styles.chipCode, on && styles.chipTextOn]}>
                  {cn} {latin}
                </Text>
              </PressableScale>
            );
          })}
        </View>

        <SectionLabel latin="CURRENCY" cn="币种" />
        <PressableScale onPress={onOpenRates} style={styles.navRow} pressTint accessibilityLabel="汇率与币种">
          <Text style={styles.navLabel}>汇率与币种</Text>
          <DotLeader />
          <Text style={styles.navValue}>
            {rates.length} 种 · 基准 {baseCurrency}
          </Text>
          <ChevronRight size={15} color={colors.dimInk} strokeWidth={1.8} />
        </PressableScale>

        <SectionLabel latin="BILLING CYCLE" cn="账期" />
        <FoldPicker
          label="起始日 BILLING DAY"
          value={billingDay === 1 ? '自然月 · 每月 1 日' : `每月 ${billingDay} 日`}
          expanded={cycleOpen}
          onToggle={() => setCycleOpen((o) => !o)}
        >
          <View style={styles.dayGrid}>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
              const on = d === billingDay;
              return (
                <PressableScale
                  key={d}
                  onPress={() => {
                    void setBillingDay(d);
                    setCycleOpen(false);
                  }}
                  style={[styles.dayChip, on && styles.chipOn]}
                  pressTint
                  accessibilityLabel={`账期起始日 ${d} 日`}
                >
                  <Text style={[styles.dayChipText, on && styles.chipTextOn]}>{d}</Text>
                </PressableScale>
              );
            })}
          </View>
        </FoldPicker>
        <Text style={styles.note}>当前账期：{md(cycleStart)} – {md(cycleEnd)}</Text>

        <SectionLabel latin="DATA" cn="数据" />
        <View style={styles.rowActions}>
          <PressableScale
            onPress={() => void exportLedger()}
            style={styles.btn}
            pressTint
            pressOpacity={0.55}
            accessibilityLabel="导出账本"
          >
            <Upload size={16} color={colors.ink} strokeWidth={1.7} />
            <Text style={styles.btnText}>导出账本</Text>
          </PressableScale>
          <PressableScale
            onPress={() => void importLedger()}
            style={styles.btn}
            pressTint
            pressOpacity={0.55}
            accessibilityLabel="导入账本"
          >
            <Download size={16} color={colors.ink} strokeWidth={1.7} />
            <Text style={styles.btnText}>导入账本</Text>
          </PressableScale>
        </View>

        <PressableScale
          onPress={confirmClear}
          style={styles.dangerRow}
          pressTint
          accessibilityLabel="清空数据"
        >
          <Trash2 size={15} color={colors.stamp} strokeWidth={1.7} />
          <Text style={styles.dangerText}>清空数据</Text>
        </PressableScale>

        <View style={styles.about}>
          <DashedRule style={styles.aboutRule} />
          <Text style={styles.aboutLine}>资产账本 · ASSET STATEMENT</Text>
          <Text style={styles.aboutLine}>凭条 · 票据质感　v0.8.12</Text>
        </View>
      </ScrollView>
    </EnterView>
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
    head: {
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
    rowActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing(3),
      marginTop: spacing(1),
    },
    btn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing(1.5),
      borderWidth: 1,
      borderColor: colors.dash,
      borderRadius: radius.ring,
      paddingHorizontal: spacing(4),
      minHeight: 44,
    },
    btnText: {
      fontFamily: fontFamily.mono,
      fontSize: t.small,
      letterSpacing: 1,
      color: colors.ink,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing(2),
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing(1.5),
      borderWidth: 1,
      borderColor: colors.dash,
      borderRadius: radius.ring,
      paddingHorizontal: spacing(3.5),
      minHeight: 44,
    },
    chipOn: {
      backgroundColor: colors.ink,
      borderColor: colors.ink,
    },
    chipCode: {
      fontFamily: fontFamily.monoMed,
      fontSize: t.small,
      letterSpacing: 1,
      color: colors.ink,
    },
    chipTextOn: {
      color: colors.onInk,
    },
    /** 账期起始日的 1-31 日胶囊云（与「添加币种」同一语言，只装数字更小） */
    dayGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing(1.5),
    },
    dayChip: {
      minWidth: 40,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.dash,
      borderRadius: radius.ring,
      paddingHorizontal: spacing(2),
    },
    dayChipText: {
      fontFamily: fontFamily.monoMed,
      fontSize: t.small,
      color: colors.ink,
      ...numerals,
    },
    note: {
      fontFamily: fontFamily.sans,
      fontSize: t.small,
      lineHeight: t.small * 1.7,
      color: colors.dimInk,
      marginTop: spacing(3),
    },
    /** 子页入口：与汇率行同一套「名目 …… 值」点线账，行尾换一枚向右的箭头 */
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing(2),
      minHeight: 44,
      paddingVertical: spacing(1.5),
    },
    navLabel: {
      fontFamily: fontFamily.sansMed,
      fontSize: t.body,
      color: colors.ink,
    },
    navValue: {
      fontFamily: fontFamily.mono,
      fontSize: t.tiny,
      letterSpacing: 0.5,
      color: colors.dimInk,
    },
    /** 与「联网更新汇率」同一胶囊语言，只是印上验讫章红；靠左小号，不再占整行 */
    dangerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing(1.5),
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: colors.stamp,
      borderRadius: radius.ring,
      paddingHorizontal: spacing(3.5),
      minHeight: 44,
      marginTop: spacing(4),
    },
    dangerText: {
      fontFamily: fontFamily.mono,
      fontSize: t.small,
      letterSpacing: 1,
      color: colors.stamp,
    },
    about: {
      marginTop: spacing(8),
      alignItems: 'center',
      gap: spacing(1.5),
    },
    aboutRule: {
      alignSelf: 'stretch',
      marginBottom: spacing(3),
    },
    aboutLine: {
      fontFamily: fontFamily.mono,
      fontSize: t.tiny,
      letterSpacing: 1,
      color: colors.dimInk,
    },
  });
