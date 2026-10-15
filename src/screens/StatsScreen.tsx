import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trash2, X } from 'lucide-react-native';

import { toCny } from '../data/sample';
import type { Expense } from '../data/types';
import { useApp } from '../state/AppContext';
import { Bars } from '../components/Bars';
import { SparkLine } from '../components/SparkLine';
import { useConfirm } from '../components/Confirm';
import { ExpenseSheet } from '../components/ExpenseSheet';
import { EnterView, PressableScale } from '../components/Motion';
import { DashedRule, DotLeader, SectionLabel } from '../components/Rule';
import { Sheet } from '../components/Sheet';
import { colors, fontFamily, numerals, radius, spacing, type as t } from '../theme';
import { currencySymbol, formatDate, formatFixed, formatNumber, formatRelativeDay } from '../utils/format';

const H_PADDING = spacing(6);
const CHART_HEIGHT = 72;
const DAY = 24 * 60 * 60 * 1000;
/** 明细先渲染的行数：ScrollView 会一次性建出所有子视图，每行十几毫秒（debug 实测），
 *  几十笔时挂载能把主线程卡住几百毫秒。先给 20 行，其余点「展开全部」。 */
const DETAIL_LIMIT = 20;

type Range = 'week' | 'month';

interface Slice {
  label: string;
  value: number;
}

function dayStart(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * 统计页：月 / 周两种口径的支出趋势 + 本月预算用量 + 净值走势。
 * 支出是热敏柱，净值是描线折线；再按账户、按备注各列前几名的点线账，
 * 最后一张明细表 —— 区间内的每一笔都能就地改（点行）或删（右侧图标，金额退回账户）。
 */
export function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const {
    expenses,
    assets,
    rates,
    deleteExpense,
    monthSpendCny,
    monthlyBudgetCny,
    setMonthlyBudget,
    snapshots,
  } = useApp();
  const { confirm } = useConfirm();
  const [range, setRange] = useState<Range>('month');
  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [budgetOpen, setBudgetOpen] = useState(false);

  const openEdit = useCallback((e: Expense) => setEditing(e), []);

  const nameOf = useCallback(
    (id: string) => assets.find((a) => a.id === id)?.name ?? '未知账户',
    [assets],
  );
  const chartWidth = width - H_PADDING * 2;

  const view = useMemo(() => {
    const now = new Date();
    const todayStart = dayStart(now);
    const start = range === 'week'
      ? todayStart - 6 * DAY
      : new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const days = Math.round((todayStart - start) / DAY) + 1;

    const daily: number[] = new Array(days).fill(0);
    const byAccount = new Map<string, number>();
    const byNote = new Map<string, number>();
    const items: Expense[] = [];

    let total = 0;
    let count = 0;
    for (const e of expenses) {
      const k = dayStart(new Date(e.date));
      if (k < start || k > todayStart) continue;
      const cny = toCny(e.amount, e.currency, rates);
      const idx = Math.round((k - start) / DAY);
      daily[idx] += cny;
      total += cny;
      count += 1;
      items.push(e);
      byAccount.set(e.accountId, (byAccount.get(e.accountId) ?? 0) + cny);
      const noteKey = e.note.trim() || '未备注';
      byNote.set(noteKey, (byNote.get(noteKey) ?? 0) + cny);
    }
    items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

    const top = (m: Map<string, number>, labelOf: (k: string) => string): Slice[] =>
      Array.from(m.entries())
        .map(([key, value]) => ({ label: labelOf(key), value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 4);

    return {
      daily,
      total,
      count,
      items,
      avg: count > 0 ? total / days : 0,
      accounts: top(byAccount, nameOf),
      notes: top(byNote, (k) => k),
    };
  }, [expenses, assets, rates, range, nameOf]);

  const confirmDelete = useCallback(
    (e: Expense) => {
      void confirm({
        title: '删除这笔支出',
        message: `「${e.note}」${currencySymbol(e.currency)}${formatFixed(e.amount)}\n金额会加回「${nameOf(e.accountId)}」。`,
        confirmText: '删除',
        destructive: true,
      }).then((ok) => {
        if (ok) deleteExpense(e.id);
      });
    },
    [confirm, deleteExpense, nameOf],
  );

  const cny = currencySymbol('CNY');
  const rangeLabel = range === 'month' ? '本月' : '近 7 天';

  return (
    <EnterView style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing(2), paddingBottom: spacing(10) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          <Text style={styles.brandName}>支出统计</Text>
          <Text style={styles.brandSub}>EXPENSE REPORT</Text>
        </View>

        <DashedRule />

        <View style={styles.toggle}>
          {(['month', 'week'] as Range[]).map((r) => {
            const on = r === range;
            return (
              <PressableScale
                key={r}
                onPress={() => setRange(r)}
                pressTint
                style={[styles.toggleChip, on && styles.toggleOn]}
                accessibilityLabel={r === 'month' ? '本月' : '本周'}
              >
                <Text style={[styles.toggleText, on && styles.toggleTextOn]}>
                  {r === 'month' ? '本月' : '本周'}
                </Text>
              </PressableScale>
            );
          })}
        </View>

        <SectionLabel latin="EXPENSE" cn={`支出 / ${rangeLabel}`} />

        <Bars values={view.daily} width={chartWidth} height={CHART_HEIGHT} replayKey={range} />

        <View style={styles.sum}>
          <DashedRule style={styles.sumRule} />
          <SumLine label="合计 TOTAL" value={`${cny}${formatFixed(view.total)}`} big />
          <SumLine label="日均 DAILY AVG" value={`${cny}${formatFixed(Math.round(view.avg * 100) / 100)}`} />
          <SumLine label="笔数 COUNT" value={String(view.count)} />
        </View>

        <SectionLabel latin="BUDGET" cn="本月预算" />
        <BudgetSection spend={monthSpendCny} budget={monthlyBudgetCny} onAdjust={() => setBudgetOpen(true)} />

        <SectionLabel latin="NET WORTH" cn="净值走势 · 近 30 天" />
        {snapshots.length < 2 ? (
          <Text style={styles.empty}>每天打开账本会自动记下当天净值，记满两天就能看走势</Text>
        ) : (
          <NetWorthTrend snapshots={snapshots} width={chartWidth} />
        )}

        <SectionLabel latin="BY ACCOUNT" cn="按账户" />
        {view.accounts.length === 0 ? (
          <Text style={styles.empty}>区间内没有支出</Text>
        ) : (
          view.accounts.map((s) => (
            <SliceRow key={s.label} label={s.label} value={`${cny}${formatFixed(s.value)}`} />
          ))
        )}

        <SectionLabel latin="BY NOTE" cn="按备注" />
        {view.notes.length === 0 ? (
          <Text style={styles.empty}>区间内没有备注</Text>
        ) : (
          view.notes.map((s) => (
            <SliceRow key={s.label} label={s.label} value={`${cny}${formatFixed(s.value)}`} />
          ))
        )}

        <SectionLabel latin="DETAIL" cn="明细" />
        {view.items.length === 0 ? (
          <Text style={styles.empty}>区间内没有支出</Text>
        ) : (
          <React.Fragment>
            {(showAll ? view.items : view.items.slice(0, DETAIL_LIMIT)).map((e) => (
              <DetailRow
                key={e.id}
                e={e}
                account={nameOf(e.accountId)}
                onDelete={confirmDelete}
                onEdit={openEdit}
              />
            ))}
            {!showAll && view.items.length > DETAIL_LIMIT ? (
              <PressableScale
                onPress={() => setShowAll(true)}
                style={styles.moreRow}
                pressTint
                accessibilityLabel={`展开全部 ${view.items.length} 笔明细`}
              >
                <Text style={styles.moreText}>
                  展开全部 {view.items.length} 笔 · SHOW ALL
                </Text>
              </PressableScale>
            ) : null}
          </React.Fragment>
        )}
      </ScrollView>

      <ExpenseSheet visible={editing !== null} edit={editing} onClose={() => setEditing(null)} />
      <BudgetSheet
        visible={budgetOpen}
        onClose={() => setBudgetOpen(false)}
        spend={monthSpendCny}
        budget={monthlyBudgetCny}
        onSave={setMonthlyBudget}
      />
    </EnterView>
  );
}

function SumLine({ label, value, big, color }: { label: string; value: string; big?: boolean; color?: string }) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <DotLeader />
      <Text style={[styles.lineValue, big && styles.lineBig, color != null && { color }]}>{value}</Text>
    </View>
  );
}

/** 预算用量格：24 格热敏打印格，≤80% 验讫绿、过八成警示赭、超线整条验讫章红 */
const BUDGET_CELLS = 24;

function BudgetSection({
  spend,
  budget,
  onAdjust,
}: {
  spend: number;
  budget: number | null;
  onAdjust: () => void;
}) {
  const cny = currencySymbol('CNY');
  if (budget == null) {
    return (
      <PressableScale onPress={onAdjust} style={styles.budgetSetup} pressTint accessibilityLabel="设置月度预算">
        <Text style={styles.budgetSetupText}>这个月打算花多少？设条线，花超了会提醒</Text>
        <Text style={styles.budgetSetupBtn}>设预算 SET</Text>
      </PressableScale>
    );
  }

  const ratio = spend / budget;
  const over = ratio > 1;
  const color = over ? colors.stamp : ratio > 0.8 ? colors.warn : colors.ok;
  const filled = Math.min(Math.ceil(Math.min(ratio, 1) * BUDGET_CELLS), BUDGET_CELLS);
  const status = over
    ? `已超支 ¥${formatNumber(Math.round(spend - budget))}`
    : ratio > 0.8
      ? '快到上限，留意一点'
      : '预算内，正常';

  return (
    <PressableScale onPress={onAdjust} style={styles.budgetBlock} pressTint accessibilityLabel="调整月度预算">
      <View style={styles.budgetCells}>
        {Array.from({ length: BUDGET_CELLS }, (_, i) => (
          <View key={i} style={[styles.budgetCell, i < filled && { backgroundColor: color }]} />
        ))}
      </View>
      <View style={styles.line}>
        <Text style={styles.lineLabel}>已用 USED</Text>
        <DotLeader />
        <Text style={[styles.lineValue, { color }]}>
          {cny}
          {formatNumber(Math.round(spend))} / {cny}
          {formatNumber(budget)}
        </Text>
      </View>
      <View style={styles.line}>
        <Text style={styles.lineLabel}>进度 STATUS</Text>
        <DotLeader />
        <Text style={[styles.lineValue, { color }]}>
          {over ? '' : `${Math.round(ratio * 100)}% · `}
          {status}
        </Text>
      </View>
    </PressableScale>
  );
}

/** 净值走势：近 30 天每日快照的折线，末尾给今天值与自首格以来的变动 */
function NetWorthTrend({
  snapshots,
  width,
}: {
  snapshots: { id: string; date: string; totalCny: number }[];
  width: number;
}) {
  const cny = currencySymbol('CNY');
  const last = snapshots[snapshots.length - 1];
  const first = snapshots[0];
  const delta = last.totalCny - first.totalCny;
  const deltaText = `${delta >= 0 ? '+' : '−'}${cny}${formatNumber(Math.abs(Math.round(delta)))}`;

  return (
    <>
      <SparkLine
        values={snapshots.map((s) => s.totalCny)}
        width={width}
        height={CHART_HEIGHT}
        replayKey={snapshots.length}
      />
      <View style={styles.sum}>
        <DashedRule style={styles.sumRule} />
        <SumLine label="今天 TODAY" value={`${cny}${formatNumber(Math.round(last.totalCny))}`} big />
        <SumLine
          label={`自 ${formatDate(first.date)} CHANGE`}
          value={deltaText}
          color={delta >= 0 ? colors.ok : colors.dimInk}
        />
      </View>
    </>
  );
}

/** 预算设置弹层：一个数字框 + 存下 / 清除 */
function BudgetSheet({
  visible,
  onClose,
  spend,
  budget,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  spend: number;
  budget: number | null;
  onSave: (cny: number | null) => void;
}) {
  const [text, setText] = useState('');
  useEffect(() => {
    if (visible) setText(budget != null ? String(budget) : '');
  }, [visible, budget]);

  const value = Number.parseFloat(text) || 0;
  const valid = text.trim() !== '' && value > 0;
  const save = () => {
    if (!valid) return;
    onSave(value);
    onClose();
  };
  const clear = () => {
    onSave(null);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.sheetHead}>
        <PressableScale onPress={onClose} style={styles.iconBtn} accessibilityLabel="关闭">
          <X size={22} color={colors.ink} strokeWidth={1.7} />
        </PressableScale>
        <Text style={styles.sheetTitle}>本月预算</Text>
        <View style={{ width: 44 }} />
      </View>
      <DashedRule />
      <View style={styles.sheetBody}>
        <Text style={styles.fieldLabel}>额度 BUDGET（¥）</Text>
        <TextInput
          value={text}
          onChangeText={(s) => setText(s.replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad"
          placeholder="例如：3000"
          placeholderTextColor={colors.dimInk}
          style={styles.budgetInput}
          autoFocus
        />
        <Text style={styles.budgetHint}>
          本月已经花了 ¥{formatNumber(Math.round(spend))}。记支出时一过这条线就会提醒你。
        </Text>
        <PressableScale
          onPress={save}
          disabled={!valid}
          style={[styles.confirmBtn, !valid && styles.confirmOff]}
          pressOpacity={0.86}
          accessibilityLabel="保存预算"
        >
          <Text style={styles.confirmText}>存下</Text>
        </PressableScale>
        {budget != null ? (
          <PressableScale onPress={clear} style={styles.clearBtn} pressTint accessibilityLabel="清除预算">
            <Text style={styles.clearText}>清除预算</Text>
          </PressableScale>
        ) : null}
      </View>
    </Sheet>
  );
}

function SliceRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <Text style={styles.sliceLabel} numberOfLines={1}>
        {label}
      </Text>
      <DotLeader />
      <Text style={styles.lineValue}>{value}</Text>
    </View>
  );
}

/** 明细行：memo 化，删一笔 / 切区间时未变的行不再重渲染。点行改这笔，长按删。 */
const DetailRow = React.memo(function DetailRow({
  e,
  account,
  onDelete,
  onEdit,
}: {
  e: Expense;
  account: string;
  onDelete: (e: Expense) => void;
  onEdit: (e: Expense) => void;
}) {
  return (
    <PressableScale
      style={styles.detailRow}
      pressTint
      onPress={() => onEdit(e)}
      onLongPress={() => onDelete(e)}
      delayLongPress={400}
      accessibilityLabel={`${e.note}，${currencySymbol(e.currency)}${formatFixed(e.amount)}，点按修改，长按删除`}
    >
      <View style={styles.detailMain}>
        <Text style={styles.detailNote} numberOfLines={1}>
          {e.note}
        </Text>
        <Text style={styles.detailSub}>
          {account}　{formatRelativeDay(e.date)}
        </Text>
      </View>
      <DotLeader />
      <Text style={styles.lineValue}>
        −{currencySymbol(e.currency)}
        {formatFixed(e.amount)}
      </Text>
      <PressableScale
        onPress={() => onDelete(e)}
        style={styles.trash}
        pressTint
        accessibilityLabel={`删除${e.note}`}
      >
        <Trash2 size={16} color={colors.stamp} strokeWidth={1.7} />
      </PressableScale>
    </PressableScale>
  );
});

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
  toggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing(2),
    marginTop: spacing(4),
  },
  toggleChip: {
    borderWidth: 1,
    borderColor: colors.dash,
    borderRadius: radius.ring,
    paddingHorizontal: spacing(4),
    minHeight: 44,
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  toggleText: {
    fontFamily: fontFamily.mono,
    fontSize: t.small,
    letterSpacing: 1,
    color: colors.ink,
  },
  toggleTextOn: {
    color: colors.onInk,
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
  sliceLabel: {
    fontFamily: fontFamily.sans,
    fontSize: t.body,
    color: colors.ink,
    maxWidth: '56%',
  },
  lineValue: {
    fontFamily: fontFamily.monoMed,
    fontSize: 15,
    color: colors.ink,
    ...numerals,
  },
  lineBig: {
    fontFamily: fontFamily.monoSemi,
    fontSize: 17,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingVertical: spacing(1),
  },
  detailMain: {
    maxWidth: '46%',
  },
  detailNote: {
    fontFamily: fontFamily.sans,
    fontSize: t.body,
    color: colors.ink,
  },
  detailSub: {
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
  moreRow: {
    borderWidth: 1,
    borderColor: colors.dash,
    borderRadius: radius.ring,
    paddingHorizontal: spacing(5),
    alignSelf: 'center',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing(3),
  },
  moreText: {
    fontFamily: fontFamily.mono,
    fontSize: t.small,
    letterSpacing: 1,
    color: colors.dimInk,
  },
  empty: {
    fontFamily: fontFamily.sans,
    fontSize: t.body,
    color: colors.dimInk,
    textAlign: 'center',
    paddingVertical: spacing(3),
  },

  // —— 本月预算 ——
  budgetSetup: {
    borderWidth: 1,
    borderColor: colors.dash,
    borderRadius: radius.ring,
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(4),
    marginTop: spacing(2),
    alignItems: 'center',
    gap: spacing(1.5),
  },
  budgetSetupText: {
    fontFamily: fontFamily.sans,
    fontSize: t.body,
    color: colors.dimInk,
    textAlign: 'center',
  },
  budgetSetupBtn: {
    fontFamily: fontFamily.monoMed,
    fontSize: t.small,
    letterSpacing: 1,
    color: colors.ink,
  },
  budgetBlock: {
    marginTop: spacing(2),
  },
  budgetCells: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: spacing(2.5),
  },
  budgetCell: {
    flex: 1,
    height: 7,
    borderRadius: 1,
    backgroundColor: colors.dashSoft,
  },

  // —— 预算弹层 ——
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing(1),
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  sheetTitle: {
    fontFamily: fontFamily.sansBold,
    fontSize: 16,
    letterSpacing: 2,
    color: colors.ink,
  },
  sheetBody: {
    paddingHorizontal: spacing(6),
    paddingTop: spacing(5),
  },
  fieldLabel: {
    fontFamily: fontFamily.mono,
    fontSize: t.label,
    letterSpacing: 2,
    color: colors.dimInk,
    marginBottom: spacing(2),
  },
  budgetInput: {
    fontFamily: fontFamily.monoMed,
    fontSize: 26,
    color: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.dash,
    minHeight: 48,
    paddingVertical: spacing(1.5),
    ...numerals,
  },
  budgetHint: {
    fontFamily: fontFamily.sans,
    fontSize: t.small,
    lineHeight: t.small * 1.7,
    color: colors.dimInk,
    marginTop: spacing(3),
  },
  confirmBtn: {
    backgroundColor: colors.ink,
    borderRadius: radius.ring,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    paddingVertical: spacing(4),
    marginTop: spacing(6),
  },
  confirmOff: {
    opacity: 0.35,
  },
  confirmText: {
    fontFamily: fontFamily.sansBold,
    fontSize: t.h2,
    letterSpacing: 3,
    color: colors.onInk,
  },
  clearBtn: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing(4),
    marginTop: spacing(1),
  },
  clearText: {
    fontFamily: fontFamily.mono,
    fontSize: t.small,
    letterSpacing: 1,
    color: colors.stamp,
  },
});
