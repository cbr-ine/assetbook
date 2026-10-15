import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import type { AssetItem, Expense, NetWorthSummary, Rate, Snapshot } from '../data/types';
import { BASE_CURRENCY, summarize, toCny } from '../data/sample';
import * as repo from '../data/repo';
import type { BackupPayload } from '../data/repo';
import { openDb } from '../data/db';

/**
 * 全 app 的内存状态 + 持久化动作。
 * 每个动作都是「先写库（repo），再改内存」，两边保持同一个事实；
 * summary / dailySpend 由内存态派生，任何改动都会自动重算。
 */

/** 主页趋势图的窗口：近 14 天 */
const TREND_DAYS = 14;
/** 净值走势取的快照数 */
const SNAPSHOT_DAYS = 30;

/** 某个资产集合折算成人民币的合计（快照与月度支出都按这个口径） */
function totalCnyOf(assets: AssetItem[], rates: Rate[]): number {
  return assets.reduce((sum, a) => sum + toCny(a.value, a.currency, rates), 0);
}

export interface AppContextValue {
  /** 数据库首次打开 + 首轮读取期间为 true */
  loading: boolean;
  /** 开库或读取失败时的原因；非空时界面走兜底页 */
  error: string | null;
  assets: AssetItem[];
  expenses: Expense[];
  rates: Rate[];
  baseCurrency: string;
  /** 折算成基准币种的净资产视图模型 */
  summary: NetWorthSummary;
  /** 近 14 天每日支出（人民币），按时间正序，最后一位是今天 */
  dailySpend: number[];
  /** 近 30 天每日净值快照（人民币），正序，末位是今天 */
  snapshots: Snapshot[];
  /** 本月支出合计（人民币） */
  monthSpendCny: number;
  /** 月度预算（人民币）；null = 未设置 */
  monthlyBudgetCny: number | null;

  saveAsset: (item: AssetItem) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  /** 拖拽排序：传组内从上到下的 id 顺序 */
  reorderAssets: (orderedIds: string[]) => Promise<void>;
  addExpense: (accountId: string, amount: number, note: string, date: string) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  /** 改一笔支出的金额与备注（差额进出账户） */
  updateExpense: (id: string, amount: number, note: string) => Promise<void>;
  /** 设月度预算；null 清除 */
  setMonthlyBudget: (cny: number | null) => Promise<void>;
  /** 导出整本账（JSON 结构，由调用方负责写文件/分享） */
  exportBackup: () => Promise<BackupPayload>;
  /** 导入备份：整本替换后重载 */
  importBackup: (payload: BackupPayload) => Promise<void>;
  saveRate: (currency: string, toCnyValue: number) => Promise<void>;
  deleteRate: (currency: string) => Promise<void>;
  setBaseCurrency: (currency: string) => Promise<void>;
  clearAll: () => Promise<void>;
  reload: () => Promise<void>;
  /** 出错后重试：重新开库 + 读一遍 */
  retry: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [baseCurrency, setBase] = useState<string>(BASE_CURRENCY);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [monthlyBudgetCny, setBudgetState] = useState<number | null>(null);

  // 最新一份 assets/rates 的镜像：动作里算「下一份快照」用，避免 setState 闭包读到旧值
  const assetsRef = useRef(assets);
  assetsRef.current = assets;
  const ratesRef = useRef(rates);
  ratesRef.current = rates;
  const expensesRef = useRef(expenses);
  expensesRef.current = expenses;

  const reload = useCallback(async () => {
    const [a, e, r, b, budget] = await Promise.all([
      repo.listAssets(),
      repo.listExpenses(),
      repo.listRates(),
      repo.getBaseCurrency(),
      repo.getMonthlyBudget(),
    ]);
    // 任何一次重载都顺手把「今天」的净值快照落一行（幂等）：开机首开 / 导入 / 清空都会走到
    await repo.upsertTodaySnapshot(totalCnyOf(a, r));
    const snaps = await repo.listSnapshots(SNAPSHOT_DAYS);
    setAssets(a);
    setExpenses(e);
    setRates(r);
    setBase(b);
    setBudgetState(budget);
    setSnapshots(snaps);  }, []);

  /** 净值变了之后调用：把今天的快照写成最新值，内存里的走势同步替换末位。 */
  const syncSnapshot = useCallback(async (nextAssets: AssetItem[], nextRates: Rate[]) => {
    const snap = await repo.upsertTodaySnapshot(totalCnyOf(nextAssets, nextRates));
    setSnapshots((prev) => [...prev.filter((s) => s.id !== snap.id), snap].slice(-SNAPSHOT_DAYS));
  }, []);

  // 开库（含建表 / 首次灌内置汇率）→ 读取。任一步失败都落到兜底页，给一次重试。
  const boot = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await openDb();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [reload]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        await openDb();
        await reload();
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [reload]);

  const summary = useMemo<NetWorthSummary>(
    () => summarize(assets, rates, baseCurrency),
    [assets, rates, baseCurrency],
  );

  const dailySpend = useMemo<number[]>(() => {
    const out: number[] = new Array(TREND_DAYS).fill(0);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const DAY = 24 * 60 * 60 * 1000;
    for (const e of expenses) {
      const d = new Date(e.date);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const idx = TREND_DAYS - 1 - Math.round((startOfToday - dayStart) / DAY);
      if (idx >= 0 && idx < TREND_DAYS) {
        out[idx] += toCny(e.amount, e.currency, rates);
      }
    }
    return out;
  }, [expenses, rates]);

  /** 本月支出合计（人民币）：预算用量按它算 */
  const monthSpendCny = useMemo(() => {
    const now = new Date();
    let sum = 0;
    for (const e of expenses) {
      const d = new Date(e.date);
      if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
        sum += toCny(e.amount, e.currency, rates);
      }
    }
    return sum;
  }, [expenses, rates]);

  const saveAsset = useCallback(
    async (item: AssetItem) => {
      const saved = await repo.upsertAsset(item);
      setAssets((prev) => {
        const idx = prev.findIndex((a) => a.id === saved.id);
        if (idx < 0) return [...prev, saved];
        const next = prev.slice();
        next[idx] = saved;
        return next;
      });
      const cur = assetsRef.current;
      const nextAssets = cur.some((a) => a.id === saved.id)
        ? cur.map((a) => (a.id === saved.id ? saved : a))
        : [...cur, saved];
      await syncSnapshot(nextAssets, ratesRef.current);
    },
    [syncSnapshot],
  );

  const deleteAsset = useCallback(
    async (id: string) => {
      await repo.deleteAsset(id);
      setAssets((prev) => prev.filter((a) => a.id !== id));
      await syncSnapshot(
        assetsRef.current.filter((a) => a.id !== id),
        ratesRef.current,
      );
    },
    [syncSnapshot],
  );

  /** 拖拽排序：写库后原地替换组内顺序（assets 本身按组分区，位置保持不动）。 */
  const reorderAssets = useCallback(async (orderedIds: string[]) => {
    await repo.reorderAssets(orderedIds);
    const rank = new Map(orderedIds.map((id, i) => [id, i] as const));
    setAssets((prev) => {
      const sorted = prev.filter((a) => rank.has(a.id)).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
      let k = 0;
      return prev.map((a) => (rank.has(a.id) ? sorted[k++] : a));
    });
  }, []);

  const addExpense = useCallback(
    async (accountId: string, amount: number, note: string, date: string) => {
      const expense = await repo.addExpense(accountId, amount, note, date);
      setExpenses((prev) => [expense, ...prev]);
      // 记账即扣减账户余额（金额已是正数，币种与账户一致）。
      setAssets((prev) =>
        prev.map((a) => (a.id === accountId ? { ...a, value: a.value - expense.amount } : a)),
      );
      await syncSnapshot(
        assetsRef.current.map((a) =>
          a.id === accountId ? { ...a, value: a.value - expense.amount } : a,
        ),
        ratesRef.current,
      );
    },
    [syncSnapshot],
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      const removed = await repo.deleteExpense(id);
      if (!removed) return;
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      // 删除即回滚：把金额加回原账户。
      setAssets((prev) =>
        prev.map((a) => (a.id === removed.accountId ? { ...a, value: a.value + removed.amount } : a)),
      );
      await syncSnapshot(
        assetsRef.current.map((a) =>
          a.id === removed.accountId ? { ...a, value: a.value + removed.amount } : a,
        ),
        ratesRef.current,
      );
    },
    [syncSnapshot],
  );

  const updateExpense = useCallback(
    async (id: string, amount: number, note: string) => {
      const prevAmount = expensesRef.current.find((e) => e.id === id)?.amount;
      const updated = await repo.updateExpense(id, amount, note);
      if (!updated) return;
      setExpenses((prev) => prev.map((e) => (e.id === id ? updated : e)));
      // 差额进出账户（repo 事务里已对库做完，这里镜像内存 + 落快照）
      const delta = prevAmount == null ? 0 : updated.amount - prevAmount;
      if (delta !== 0) {
        const acct = updated.accountId;
        setAssets((prev) => prev.map((a) => (a.id === acct ? { ...a, value: a.value - delta } : a)));
        await syncSnapshot(
          assetsRef.current.map((a) => (a.id === acct ? { ...a, value: a.value - delta } : a)),
          ratesRef.current,
        );
      }
    },
    [syncSnapshot],
  );

  const saveRate = useCallback(async (currency: string, toCnyValue: number) => {
    const saved = await repo.upsertRate(currency, toCnyValue);
    setRates((prev) => {
      const idx = prev.findIndex((r) => r.currency === saved.currency);
      if (idx < 0) return [...prev, saved].sort((a, b) => a.currency.localeCompare(b.currency));
      const next = prev.slice();
      next[idx] = saved;
      return next;
    });
  }, []);

  const deleteRate = useCallback(async (currency: string) => {
    await repo.deleteRate(currency);
    setRates((prev) => prev.filter((r) => r.currency !== currency));
  }, []);

  const setBaseCurrency = useCallback(async (currency: string) => {
    await repo.setBaseCurrency(currency);
    setBase(currency);
  }, []);

  const setMonthlyBudget = useCallback(async (cny: number | null) => {
    await repo.setMonthlyBudget(cny);
    setBudgetState(cny);
  }, []);

  const exportBackup = useCallback(() => repo.exportAll(), []);

  const importBackup = useCallback(
    async (payload: BackupPayload) => {
      await repo.importAll(payload);
      await reload();
    },
    [reload],
  );

  const clearAll = useCallback(async () => {
    await repo.clearAll();
    await reload();
  }, [reload]);

  const value = useMemo<AppContextValue>(
    () => ({
      loading,
      error,
      assets,
      expenses,
      rates,
      baseCurrency,
      summary,
      dailySpend,
      snapshots,
      monthSpendCny,
      monthlyBudgetCny,
      saveAsset,
      deleteAsset,
      reorderAssets,
      addExpense,
      deleteExpense,
      updateExpense,
      setMonthlyBudget,
      exportBackup,
      importBackup,
      saveRate,
      deleteRate,
      setBaseCurrency,
      clearAll,
      reload,
      retry: boot,
    }),
    [
      loading,
      error,
      assets,
      expenses,
      rates,
      baseCurrency,
      summary,
      dailySpend,
      snapshots,
      monthSpendCny,
      monthlyBudgetCny,
      saveAsset,
      deleteAsset,
      reorderAssets,
      addExpense,
      deleteExpense,
      updateExpense,
      setMonthlyBudget,
      exportBackup,
      importBackup,
      saveRate,
      deleteRate,
      setBaseCurrency,
      clearAll,
      reload,
      boot,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** 读取全局状态；必须在 AppProvider 内使用。 */
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp 必须在 AppProvider 内使用');
  return ctx;
}
