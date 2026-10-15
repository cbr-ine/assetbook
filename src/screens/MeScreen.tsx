import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CloudDownload, Download, Plus, Trash2, Upload } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { Rate } from '../data/types';
import { CURRENCIES, currencyName } from '../data/currencies';
import { assertBackupPayload } from '../data/repo';
import { useApp } from '../state/AppContext';
import { useConfirm } from '../components/Confirm';
import { EnterView, PressableScale } from '../components/Motion';
import { FoldPicker } from '../components/FoldPicker';
import { DashedRule, DotLeader, SectionLabel } from '../components/Rule';
import { useToast } from '../components/Toast';
import { colors, fontFamily, numerals, radius, spacing, type as t } from '../theme';

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
 * 我的：汇率表（可联网更新）、基准币种、清空数据、关于。
 * 净值一律按人民币折算，基准币种只影响展示符号。
 */
export function MeScreen() {
  const insets = useSafeAreaInsets();
  const {
    rates,
    baseCurrency,
    saveRate,
    deleteRate,
    setBaseCurrency,
    clearAll,
    exportBackup,
    importBackup,
  } = useApp();
  const toast = useToast();
  const { confirm } = useConfirm();

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

        <SectionLabel latin="RATES" cn="汇率（1 单位 = ? 人民币）" />
        {rates.map((r) => (
          <RateRow
            key={r.currency}
            rate={r}
            onCommit={(value) => void saveRate(r.currency, value)}
            onDelete={() => void deleteRate(r.currency)}
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
        <Text style={styles.fxNote}>
          {fxUpdatedAt
            ? `已联网更新 · ${fxUpdatedAt} · 来源 ${FX_SOURCE}`
            : '当前为内置汇率 · 点「联网更新汇率」取实时价'}
        </Text>

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
        <Text style={styles.note}>净值一律按人民币折算，基准币种只改变展示符号。</Text>

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
        <Text style={styles.dangerNote}>
          导出成 JSON 文件留底或换机搬用；导入会整本替换当前数据，导入前先导出一份更稳。
        </Text>

        <PressableScale
          onPress={confirmClear}
          style={styles.dangerRow}
          pressTint
          accessibilityLabel="清空数据"
        >
          <Trash2 size={15} color={colors.stamp} strokeWidth={1.7} />
          <Text style={styles.dangerText}>清空数据</Text>
        </PressableScale>
        <Text style={styles.dangerNote}>删除所有资产、支出与汇率，不可恢复</Text>

        <View style={styles.about}>
          <DashedRule style={styles.aboutRule} />
          <Text style={styles.aboutLine}>资产账本 · ASSET STATEMENT</Text>
          <Text style={styles.aboutLine}>凭条 · 票据质感　v0.4.0</Text>
          <Text style={styles.aboutLine}>本地记账，数据不出设备</Text>
        </View>
      </ScrollView>
    </EnterView>
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

const styles = StyleSheet.create({
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
  },
  dangerText: {
    fontFamily: fontFamily.mono,
    fontSize: t.small,
    letterSpacing: 1,
    color: colors.stamp,
  },
  dangerNote: {
    fontFamily: fontFamily.sans,
    fontSize: t.tiny,
    color: colors.dim,
    marginTop: spacing(2),
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
