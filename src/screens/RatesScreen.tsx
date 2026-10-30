import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, CloudDownload, Plus, Trash2 } from 'lucide-react-native';

import type { Rate } from '../data/types';
import { CURRENCIES, currencyName } from '../data/currencies';
import { useApp } from '../state/AppContext';
import { useTheme, useThemedStyles } from '../state/ThemeContext';
import { FoldPicker } from '../components/FoldPicker';
import { useConfirm } from '../components/Confirm';
import { PressableScale } from '../components/Motion';
import { DashedRule, DotLeader, SectionLabel } from '../components/Rule';
import { useToast } from '../components/Toast';
import { fontFamily, motion, numerals, radius, spacing, type as t, type Palette } from '../theme';

const H_PADDING = spacing(6);

/** 联网汇率来源：接口给「1 CNY = X 外币」，故 toCny = 1 / X。 */
const FX_API = 'https://open.er-api.com/v6/latest/CNY';
const FX_SOURCE = 'open.er-api.com';

/** 本地时钟串（YYYY-MM-DD HH:mm），仅作展示。 */
function nowStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * 汇率与币种子页：汇率表（可联网更新）、添加币种、基准币种。
 * 从「我的」整页推入，盖住底部导航；左上角返回，Android 返回键同效。
 * 净值一律按人民币折算，基准币种只影响展示符号。
 */
export function RatesScreen({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const {
    rates,
    assets,
    baseCurrency,
    saveRate,
    deleteRate,
    setBaseCurrency,
  } = useApp();
  const toast = useToast();
  const { confirm } = useConfirm();

  // 进场：从右侧 24px 滑入 + 淡入；退场对称收回（Sheet 同款的 mounted 模式，
  // 动画播完才卸载，避免最后一帧闪空）
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

  // Android 返回键只在子页可见时接管；关着时不能拦，否则全局的「返回退出应用」会被吞掉
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const [fxBusy, setFxBusy] = useState(false);
  const [fxUpdatedAt, setFxUpdatedAt] = useState<string | null>(null);
  /** 添加币种选择器展开态 */
  const [fxAdding, setFxAdding] = useState(false);

  const baseCodes = useMemo(() => {
    const set = new Set<string>(rates.map((r) => r.currency));
    set.add(baseCurrency);
    return Array.from(set).sort();
  }, [rates, baseCurrency]);

  /** 内置币种里还没加进汇率表的，供「添加币种」挑选。 */
  const remaining = useMemo(
    () => CURRENCIES.filter((c) => !rates.some((r) => r.currency === c.code)),
    [rates],
  );

  const addCurrency = (code: string) => {
    void saveRate(code, 1).then(() => {
      toast.show(`已添加 ${code} ${currencyName(code)}，请把汇率改成实际值`);
    });
  };

  /**
   * 删汇率前先看有没有资产在用这个币种：toCny 对没有汇率的币种按 1:1 折算，
   * 直接删会让净资产静默算错 —— 提示清楚再让用户决定。
   */
  const removeRate = (currency: string) => {
    const used = assets.filter((a) => a.currency === currency);
    const go = () => void deleteRate(currency);
    if (used.length === 0) {
      go();
      return;
    }
    void confirm({
      title: `删除 ${currency} 汇率`,
      message:
        `还有 ${used.length} 项资产按${currency}记账（如「${used[0].name}」）。\n` +
        '删除后这些资产按 1:1 当人民币折算，净资产会跟着变。确定删吗？',
      confirmText: '删除',
      destructive: true,
    }).then((ok) => {
      if (ok) go();
    });
  };

  /** 联网取实时汇率，逐个写回汇率表。 */
  const fetchRates = async () => {
    if (fxBusy) return;
    setFxBusy(true);
    try {
      const res = await fetch(FX_API);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { rates?: Record<string, number> } = await res.json();
      const table = data.rates;
      if (!table) throw new Error('unexpected payload');
      let n = 0;
      for (const r of rates) {
        if (r.currency === 'CNY') continue;
        const x = table[r.currency];
        if (typeof x === 'number' && x > 0) {
          await saveRate(r.currency, Number((1 / x).toPrecision(5)));
          n += 1;
        }
      }
      setFxUpdatedAt(nowStamp());
      toast.show(`汇率已更新 · ${n} 种 · 来源 ${FX_SOURCE}`);
    } catch {
      toast.show('联网获取失败，请检查网络后重试，或继续用当前汇率');
    } finally {
      setFxBusy(false);
    }
  };

  if (!mounted) return null;

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
          <PressableScale onPress={onClose} style={styles.back} pressTint accessibilityLabel="返回我的">
            <ChevronLeft size={22} color={colors.ink} strokeWidth={1.8} />
          </PressableScale>
          <View style={styles.headCenter}>
            <Text style={styles.brandName}>汇率与币种</Text>
            <Text style={styles.brandSub}>RATES &amp; CURRENCY</Text>
          </View>
          {/* 与左侧返回键对称的占位，让标题真正居中 */}
          <View style={styles.back} />
        </View>

        <DashedRule />

        <SectionLabel latin="RATES" cn="汇率（1 单位 = ? 人民币）" />
        {rates.map((r) => (
          <RateRow
            key={r.currency}
            rate={r}
            onCommit={(value) => void saveRate(r.currency, value)}
            onDelete={() => removeRate(r.currency)}
          />
        ))}

        <View style={styles.rowActions}>
          <PressableScale
            onPress={() => void fetchRates()}
            disabled={fxBusy}
            style={[styles.btn, fxBusy && styles.btnBusy]}
            pressTint
            pressOpacity={0.55}
            accessibilityLabel="联网更新汇率"
          >
            {fxBusy ? (
              <ActivityIndicator size="small" color={colors.ink} />
            ) : (
              <CloudDownload size={16} color={colors.ink} strokeWidth={1.7} />
            )}
            <Text style={styles.btnText}>{fxBusy ? '获取中…' : '联网更新汇率'}</Text>
          </PressableScale>
        </View>
        {fxUpdatedAt ? (
          <Text style={styles.fxNote}>已联网更新 · {fxUpdatedAt} · 来源 {FX_SOURCE}</Text>
        ) : null}

        <SectionLabel latin="CURRENCY" cn="添加币种" />
        {remaining.length === 0 ? (
          <Text style={styles.note}>所有内置币种都已添加。</Text>
        ) : (
          <FoldPicker
            label="待选 CANDIDATES"
            value={`${remaining.length} 种`}
            expanded={fxAdding}
            onToggle={() => setFxAdding((o) => !o)}
          >
            <View style={styles.chips}>
              {remaining.map((c) => (
                <PressableScale
                  key={c.code}
                  onPress={() => {
                    addCurrency(c.code);
                    setFxAdding(false);
                  }}
                  style={styles.chip}
                  pressTint
                  accessibilityLabel={`添加 ${c.code}`}
                >
                  <Text style={styles.chipCode}>{c.code}</Text>
                  <Text style={styles.chipName}>{c.name}</Text>
                  <Plus size={13} color={colors.dimInk} strokeWidth={1.8} />
                </PressableScale>
              ))}
            </View>
          </FoldPicker>
        )}

        <SectionLabel latin="BASE" cn="基准币种" />
        <View style={styles.chips}>
          {baseCodes.map((c) => {
            const on = c === baseCurrency;
            return (
              <PressableScale
                key={c}
                onPress={() => void setBaseCurrency(c)}
                style={[styles.chip, styles.chipBase, on && styles.chipOn]}
                pressTint
                accessibilityLabel={`基准币种 ${c}`}
              >
                <Text style={[styles.chipCode, on && styles.chipTextOn]}>{c}</Text>
              </PressableScale>
            );
          })}
        </View>
      </ScrollView>
    </Animated.View>
  );
}

function RateRow({
  rate,
  onCommit,
  onDelete,
}: {
  rate: Rate;
  onCommit: (value: number) => void;
  onDelete: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const [text, setText] = useState(String(rate.toCny));
  const isBaseCny = rate.currency === 'CNY';

  // 外部（保存后 / 联网更新后）回填时同步显示。
  useEffect(() => {
    setText(String(rate.toCny));
  }, [rate.toCny]);

  const commit = () => {
    const value = Number.parseFloat(text);
    if (!Number.isFinite(value) || value <= 0) {
      setText(String(rate.toCny));
      return;
    }
    onCommit(value);
  };

  return (
    <View style={styles.rateRow}>
      <Text style={styles.rateCode}>{rate.currency}</Text>
      <Text style={styles.rateName}>{currencyName(rate.currency)}</Text>
      <DotLeader />
      <TextInput
        value={text}
        onChangeText={(v) => setText(v.replace(/[^0-9.]/g, ''))}
        onEndEditing={commit}
        editable={!isBaseCny}
        keyboardType="decimal-pad"
        accessibilityLabel={`${rate.currency} 汇率`}
        style={[styles.input, styles.rateInput, isBaseCny && styles.inputDisabled]}
      />
      <Text style={styles.rateSuffix}>CNY</Text>
      {isBaseCny ? (
        <View style={styles.trashSpacer} />
      ) : (
        <PressableScale
          onPress={onDelete}
          style={styles.trash}
          pressTint
          accessibilityLabel={`删除 ${rate.currency}`}
        >
          <Trash2 size={16} color={colors.dimInk} strokeWidth={1.7} />
        </PressableScale>
      )}
    </View>
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
    rateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing(1.5),
      gap: spacing(2),
      minHeight: 44,
    },
    rateCode: {
      fontFamily: fontFamily.monoMed,
      fontSize: 15,
      letterSpacing: 1,
      color: colors.ink,
    },
    rateName: {
      fontFamily: fontFamily.sans,
      fontSize: t.small,
      color: colors.dimInk,
      maxWidth: '30%',
    },
    rateSuffix: {
      fontFamily: fontFamily.mono,
      fontSize: t.tiny,
      color: colors.dimInk,
      letterSpacing: 1,
    },
    input: {
      fontFamily: fontFamily.monoMed,
      fontSize: 15,
      color: colors.ink,
      borderBottomWidth: 1,
      borderBottomColor: colors.dash,
      minHeight: 44,
      paddingVertical: spacing(1),
      ...numerals,
    },
    inputDisabled: {
      color: colors.dimInk,
      borderBottomColor: colors.dashSoft,
    },
    rateInput: {
      width: 88,
      textAlign: 'right',
    },
    /** 44pt 命中区，但用负边距把视觉宽度收回图标大小 */
    trash: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: -spacing(2.5),
      marginRight: -spacing(3),
      borderRadius: 6,
    },
    /** 与上面一枚的「视觉宽度」对齐（44 − 负边距共 22）*/
    trashSpacer: {
      width: 22,
    },
    rowActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing(3),
      marginTop: spacing(3),
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
    btnBusy: {
      opacity: 0.7,
    },
    btnText: {
      fontFamily: fontFamily.mono,
      fontSize: t.small,
      letterSpacing: 1,
      color: colors.ink,
    },
    fxNote: {
      fontFamily: fontFamily.mono,
      fontSize: t.tiny,
      letterSpacing: 0.4,
      color: colors.dimInk,
      marginTop: spacing(2),
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
    chipBase: {
      gap: 0,
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
    chipName: {
      fontFamily: fontFamily.sans,
      fontSize: t.tiny,
      color: colors.dimInk,
    },
    chipTextOn: {
      color: colors.onInk,
    },
    note: {
      fontFamily: fontFamily.sans,
      fontSize: t.small,
      lineHeight: t.small * 1.7,
      color: colors.dimInk,
      marginTop: spacing(3),
    },
  });
