import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Delete, X } from 'lucide-react-native';

import { useApp } from '../state/AppContext';
import { toCny } from '../data/sample';
import type { AssetItem, Expense } from '../data/types';
import { colors, fontFamily, numerals, radius, spacing, type as t } from '../theme';
import { currencySymbol, formatFixed, formatNumber, formatRelativeDay } from '../utils/format';
import { FoldPicker } from './FoldPicker';
import { PressableScale } from './Motion';
import { RollingNumber } from './RollingNumber';
import { DashedRule } from './Rule';
import { Sheet } from './Sheet';
import { useToast } from './Toast';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** 传入则进入编辑模式：只改金额与备注，账户、日期沿用原单不动 */
  edit?: Expense | null;
}

const KEYS: string[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];
/** 大金额（44pt）每个数码的行高，数字滚动按它分格 */
const AMOUNT_CELL = Math.round(44 * 1.1);

/** 本地 ISO 时间串（YYYY-MM-DDTHH:mm:ss），避免 toISOString 的 UTC 偏移。 */
function localIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/**
 * 记支出弹层：一块等宽大金额 + 一台热敏数字键盘。
 * 选一个流动账户，确认后从该账户余额里扣掉这笔钱。
 * 金额逐位滚动；升降由 Sheet 自绘（0.28s 升 / 0.2s 纱幕，无下滑关闭）。
 */
export function ExpenseSheet({ visible, onClose, edit = null }: Props) {
  const { assets, addExpense, updateExpense, rates, monthSpendCny, monthlyBudgetCny } = useApp();
  const toast = useToast();
  const accounts = useMemo(() => assets.filter((a) => a.group === 'liquid'), [assets]);

  const [amountText, setAmountText] = useState('');
  const [accountId, setAccountId] = useState('');
  const [note, setNote] = useState('');
  const [dayOffset, setDayOffset] = useState(0);
  /** 账户选择器展开态：默认收起一行，点开再挑 */
  const [accountsOpen, setAccountsOpen] = useState(false);
  // 每次打开换一个 key，让金额从零落位而不是滚一遍旧值
  const [session, setSession] = useState(0);

  // 打开时复位：编辑模式带出原单的金额备注，新增模式默认选中第一个流动账户。
  useEffect(() => {
    if (!visible) return;
    setAccountsOpen(false);
    setSession((n) => n + 1);
    if (edit) {
      setAmountText(String(Math.round(edit.amount * 100) / 100));
      setNote(edit.note);
      setAccountId(edit.accountId);
    } else {
      setAmountText('');
      setNote('');
      setDayOffset(0);
      setAccountId((prev) => (accounts.some((a) => a.id === prev) ? prev : accounts[0]?.id ?? ''));
    }
  }, [visible, accounts, edit]);

  const account = accounts.find((a) => a.id === accountId);
  const amount = Number.parseFloat(amountText) || 0;
  const canConfirm = amount > 0 && (edit != null || account !== undefined);

  // 按键链路要窄：amountText 每敲一键都变，弹层里其余子树（键盘 / 账户片 /
  // 备注框 / 日期片）全部 memo + 回调恒定，敲键时只有金额那一行重渲染。
  const press = useCallback((key: string) => {
    setAmountText((prev) => {
      if (key === 'del') return prev.slice(0, -1);
      if (key === '.') return prev.includes('.') ? prev : prev === '' ? '0.' : `${prev}.`;
      if (prev.length >= 12) return prev;
      return prev === '0' ? key : `${prev}${key}`;
    });
  }, []);
  const toggleAccounts = useCallback(() => setAccountsOpen((o) => !o), []);
  const pickAccount = useCallback((id: string) => {
    setAccountId(id);
    setAccountsOpen(false);
  }, []);
  const setDay = useCallback((off: number) => setDayOffset(off), []);

  const date = localIso(new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000));

  /** 记完 / 改完一笔，看本月花销是否恰好跨过预算线；只在跨越那一刻提醒一次 */
  const maybeBudgetToast = (deltaCny: number, monthKey: string) => {
    if (monthlyBudgetCny == null || monthKey !== localIso(new Date()).slice(0, 7)) return;
    const after = monthSpendCny + deltaCny;
    if (monthSpendCny <= monthlyBudgetCny && after > monthlyBudgetCny) {
      toast.show(
        `本月已超预算：用了 ¥${formatNumber(Math.round(after))} / ¥${formatNumber(monthlyBudgetCny)}`,
      );
    }
  };

  const confirm = async () => {
    if (!canConfirm) return;
    if (edit) {
      await updateExpense(edit.id, amount, note.trim());
      maybeBudgetToast(
        toCny(amount, edit.currency, rates) - toCny(edit.amount, edit.currency, rates),
        edit.date.slice(0, 7),
      );
    } else if (account) {
      await addExpense(account.id, amount, note.trim(), date);
      maybeBudgetToast(toCny(amount, account.currency, rates), date.slice(0, 7));
    }
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <SheetHead onClose={onClose} title={edit ? '改这笔支出' : '记一笔支出'} />

      <DashedRule />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.amountRow, amountText === '' && styles.amountRowEmpty]}>
          <Text
            style={[styles.amountCur, { lineHeight: AMOUNT_CELL }]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {currencySymbol(account?.currency ?? 'CNY')}
          </Text>
          <RollingNumber
            key={session}
            text={amountText === '' ? '0' : amountText}
            cellHeight={AMOUNT_CELL}
            style={styles.amount}
          />
        </View>
        <Text style={styles.amountSub}>
          {account
            ? `${edit ? '改' : '从'}「${account.name}」${edit ? '这笔 · ' : '支出 · '}${formatFixed(amount)}`
            : edit
              ? '只改金额与备注'
              : '先选一个账户'}
        </Text>

        {edit ? (
          <OriginalLine accountName={account?.name ?? '账户已删除'} day={formatRelativeDay(edit.date)} />
        ) : (
          <FoldPicker
            label="账户 ACCOUNT"
            value={account ? account.name : '先选一个账户'}
            dim={!account}
            expanded={accountsOpen}
            onToggle={toggleAccounts}
          >
            {accounts.length === 0 ? (
              <Text style={styles.empty}>没有可用的流动账户，请先在「资产」里添加</Text>
            ) : (
              <AccountChips accounts={accounts} selectedId={accountId} onPick={pickAccount} />
            )}
          </FoldPicker>
        )}

        <NoteField note={note} onChange={setNote} />

        {edit ? null : (
          <>
            <Text style={styles.fieldLabel}>日期 DATE</Text>
            <DateChips dayOffset={dayOffset} onSet={setDay} label={formatRelativeDay(date)} />
          </>
        )}

        <Keypad onKey={press} />

        <PressableScale
          onPress={confirm}
          disabled={!canConfirm}
          style={[styles.confirm, !canConfirm && styles.confirmOff]}
          pressOpacity={0.86}
          accessibilityLabel={edit ? '改好这笔' : '记下这笔'}
        >
          <Text style={styles.confirmText}>{edit ? '改好这笔' : '记下这笔'}</Text>
        </PressableScale>
      </ScrollView>
    </Sheet>
  );
}

/** 弹层头：关闭键 + 标题，与金额输入无关，memo 住不跟着敲键重渲染 */
const SheetHead = memo(function SheetHead({ onClose, title }: { onClose: () => void; title: string }) {
  return (
    <View style={styles.head}>
      <PressableScale onPress={onClose} style={styles.iconBtn} accessibilityLabel="关闭">
        <X size={22} color={colors.ink} strokeWidth={1.7} />
      </PressableScale>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.headSpacer} />
    </View>
  );
});

/** 编辑模式的原单信息：账户与日期定死不动，摆成一张选中的票根 */
const OriginalLine = memo(function OriginalLine({
  accountName,
  day,
}: {
  accountName: string;
  day: string;
}) {
  return (
    <>
      <Text style={styles.fieldLabel}>原单 ORIGINAL</Text>
      <View style={styles.chips}>
        <View style={[styles.chip, styles.chipOn]}>
          <Text style={[styles.chipText, styles.chipTextOn]} numberOfLines={1}>
            {accountName}
          </Text>
        </View>
        <Text style={styles.dateText}>{day}</Text>
      </View>
    </>
  );
});

/** 账户选择片：只在账户列表 / 选中项变化时重渲染 */
const AccountChips = memo(function AccountChips({
  accounts,
  selectedId,
  onPick,
}: {
  accounts: AssetItem[];
  selectedId: string;
  onPick: (id: string) => void;
}) {
  return (
    <View style={styles.chips}>
      {accounts.map((a) => {
        const on = a.id === selectedId;
        return (
          <PressableScale
            key={a.id}
            onPress={() => onPick(a.id)}
            pressTint
            style={[styles.chip, on && styles.chipOn]}
            accessibilityLabel={a.name}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1}>
              {a.name}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
});

/** 备注输入：只在备注文本变化时重渲染 */
const NoteField = memo(function NoteField({
  note,
  onChange,
}: {
  note: string;
  onChange: (s: string) => void;
}) {
  return (
    <>
      <Text style={styles.fieldLabel}>备注 NOTE</Text>
      <TextInput
        value={note}
        onChangeText={onChange}
        placeholder="例如：午餐"
        placeholderTextColor={colors.dimInk}
        style={styles.noteInput}
      />
    </>
  );
});

/** 今天 / 昨天两片 + 相对日：只跟 dayOffset 走 */
const DateChips = memo(function DateChips({
  dayOffset,
  onSet,
  label,
}: {
  dayOffset: number;
  onSet: (off: number) => void;
  label: string;
}) {
  return (
    <View style={styles.chips}>
      {[0, 1].map((off) => {
        const on = off === dayOffset;
        return (
          <PressableScale
            key={off}
            onPress={() => onSet(off)}
            pressTint
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>
              {off === 0 ? '今天' : '昨天'}
            </Text>
          </PressableScale>
        );
      })}
      <Text style={styles.dateText}>{label}</Text>
    </View>
  );
});

/** 数字键盘：敲键时唯一不该动的大块子树 */
const Keypad = memo(function Keypad({ onKey }: { onKey: (k: string) => void }) {
  return (
    <View style={styles.keypad}>
      {KEYS.map((k) => (
        <PressableScale
          key={k}
          onPress={() => onKey(k)}
          style={styles.key}
          pressTint
          accessibilityLabel={k === 'del' ? '退格' : k}
        >
          {k === 'del' ? (
            <Delete size={24} color={colors.ink} strokeWidth={1.7} />
          ) : (
            <Text style={styles.keyText}>{k}</Text>
          )}
        </PressableScale>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing(6),
    paddingBottom: spacing(8),
  },
  head: {
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
  headSpacer: {
    width: 44,
  },
  title: {
    fontFamily: fontFamily.sansBold,
    fontSize: 16,
    letterSpacing: 2,
    color: colors.ink,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginTop: spacing(5),
  },
  amountRowEmpty: {
    opacity: 0.35,
  },
  amount: {
    fontFamily: fontFamily.monoSemi,
    fontSize: 44,
    color: colors.ink,
    letterSpacing: -0.5,
    ...numerals,
  },
  amountCur: {
    fontFamily: fontFamily.monoMed,
    fontSize: 26,
  },
  amountSub: {
    fontFamily: fontFamily.mono,
    fontSize: t.small,
    color: colors.dimInk,
    textAlign: 'center',
    marginTop: spacing(2),
    letterSpacing: 0.5,
  },
  fieldLabel: {
    fontFamily: fontFamily.mono,
    fontSize: t.label,
    letterSpacing: 2,
    color: colors.dimInk,
    marginTop: spacing(5),
    marginBottom: spacing(2),
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing(2),
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.dash,
    borderRadius: radius.ring,
    paddingHorizontal: spacing(3.5),
    minHeight: 44,
    justifyContent: 'center',
    maxWidth: '60%',
  },
  chipOn: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  chipText: {
    fontFamily: fontFamily.mono,
    fontSize: t.small,
    color: colors.ink,
  },
  chipTextOn: {
    color: colors.onInk,
  },
  empty: {
    fontFamily: fontFamily.sans,
    fontSize: t.small,
    color: colors.dimInk,
  },
  noteInput: {
    fontFamily: fontFamily.sans,
    fontSize: t.body,
    color: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.dash,
    minHeight: 44,
    paddingVertical: spacing(1.5),
  },
  dateText: {
    fontFamily: fontFamily.mono,
    fontSize: t.small,
    color: colors.dimInk,
    marginLeft: spacing(1),
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing(5),
  },
  key: {
    width: '33.333%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 58,
    borderRadius: 8,
  },
  keyText: {
    fontFamily: fontFamily.monoMed,
    fontSize: 26,
    color: colors.ink,
    ...numerals,
  },
  confirm: {
    backgroundColor: colors.ink,
    borderRadius: radius.ring,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    paddingVertical: spacing(4),
    marginTop: spacing(3),
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
});
