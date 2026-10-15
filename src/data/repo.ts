import type { AssetGroup, AssetItem, AssetType, Expense, Rate, Snapshot } from './types';
import { NEGATIVE_TYPES, TYPE_GROUP } from './types';
import { BASE_CURRENCY } from './sample';
import { openDb } from './db';
import {
  META_BASE_CURRENCY,
  META_MONTHLY_BUDGET,
  META_SEEDED,
  TABLE_ASSETS,
  TABLE_EXPENSES,
  TABLE_META,
  TABLE_RATES,
  TABLE_SNAPSHOTS,
} from './schema';

/**
 * 资产 / 支出 / 汇率 / 设置的增删改查。
 * 每个函数返回 types.ts 里的纯对象；行（snake_case）在这里映射成驼峰。
 * 记支出会扣减账户余额、删支出会回滚，均在同一个事务里完成，保证库内自洽。
 */

// —— 数据库行类型（仅内部使用，与 schema.ts 的列一一对应）——

interface AssetRow {
  id: string;
  name: string;
  value: number;
  currency: string;
  asset_group: string;
  type: string;
  photo_uri: string | null;
  icon_key: string | null;
  note: string | null;
  sort: number;
}

interface ExpenseRow {
  id: string;
  amount: number;
  currency: string;
  note: string;
  date: string;
  account_id: string;
}

interface RateRow {
  currency: string;
  to_cny: number;
}

interface MetaRow {
  meta_key: string;
  meta_value: string;
}

// —— 行 → 领域对象 ——

function mapAsset(r: AssetRow): AssetItem {
  return {
    id: r.id,
    name: r.name,
    value: r.value,
    currency: r.currency,
    group: r.asset_group as AssetGroup,
    type: r.type as AssetType,
    photoUri: r.photo_uri ?? undefined,
    iconKey: r.icon_key ?? undefined,
    note: r.note ?? undefined,
    sort: r.sort,
  };
}

function mapExpense(r: ExpenseRow): Expense {
  return {
    id: r.id,
    amount: r.amount,
    currency: r.currency,
    note: r.note,
    date: r.date,
    accountId: r.account_id,
  };
}

function mapRate(r: RateRow): Rate {
  return { currency: r.currency, toCny: r.to_cny };
}

/** 生成一个本地唯一 id（无外部依赖）。 */
export function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** 本地日期串（YYYY-MM-DD，按设备时区）。 */
export function todayKey(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// —— 资产 ——

/** 全部资产项：可流动在前，再按 sort、名称。 */
export async function listAssets(): Promise<AssetItem[]> {
  const db = await openDb();
  const rows = await db.getAllAsync<AssetRow>(
    `SELECT * FROM ${TABLE_ASSETS}
     ORDER BY CASE asset_group WHEN 'liquid' THEN 0 ELSE 1 END, sort, name`,
  );
  return rows.map(mapAsset);
}

/** 新增或更新一个资产项；id 为空串时自动生成。返回落库后的对象。 */
export async function upsertAsset(item: AssetItem): Promise<AssetItem> {
  const db = await openDb();
  const withId: AssetItem = item.id ? item : { ...item, id: genId('a') };
  await db.runAsync(
    `INSERT OR REPLACE INTO ${TABLE_ASSETS}
       (id, name, value, currency, asset_group, type, photo_uri, icon_key, note, sort)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      withId.id,
      withId.name,
      withId.value,
      withId.currency,
      withId.group,
      withId.type,
      withId.photoUri ?? null,
      withId.iconKey ?? null,
      withId.note ?? null,
      withId.sort ?? 0,
    ],
  );
  return withId;
}

export async function deleteAsset(id: string): Promise<void> {
  const db = await openDb();
  await db.runAsync(`DELETE FROM ${TABLE_ASSETS} WHERE id = ?`, [id]);
}

/**
 * 拖拽排序落库：按传入顺序把这一组资产项的 sort 重排为 0..n-1。
 * 排序查询按「分组 → sort」取数，所以组内重排不影响另一组。
 */
export async function reorderAssets(orderedIds: string[]): Promise<void> {
  const db = await openDb();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < orderedIds.length; i += 1) {
      await db.runAsync(`UPDATE ${TABLE_ASSETS} SET sort = ? WHERE id = ?`, [i, orderedIds[i]]);
    }
  });
}

// —— 支出 ——

/** 全部支出，最新在前。 */
export async function listExpenses(): Promise<Expense[]> {
  const db = await openDb();
  const rows = await db.getAllAsync<ExpenseRow>(`SELECT * FROM ${TABLE_EXPENSES} ORDER BY date DESC`);
  return rows.map(mapExpense);
}

/**
 * 记一笔支出：写入 expenses，并从 account 的 value 里扣掉这笔金额（同一事务）。
 * 金额取绝对值；币种取账户币种，冗余存一份便于统计。
 */
export async function addExpense(
  accountId: string,
  amount: number,
  note: string,
  date: string,
): Promise<Expense> {
  const db = await openDb();
  const acct = await db.getFirstAsync<{ currency: string }>(
    `SELECT currency FROM ${TABLE_ASSETS} WHERE id = ?`,
    [accountId],
  );
  const currency = acct?.currency ?? BASE_CURRENCY;
  const expense: Expense = { id: genId('e'), amount: Math.abs(amount), currency, note, accountId, date };

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO ${TABLE_EXPENSES} (id, amount, currency, note, date, account_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [expense.id, expense.amount, expense.currency, expense.note, expense.date, expense.accountId],
    );
    await db.runAsync(`UPDATE ${TABLE_ASSETS} SET value = value - ? WHERE id = ?`, [expense.amount, accountId]);
  });

  return expense;
}

/** 删除一笔支出，并把它加回对应账户余额。返回被删的支出（不存在则 null）。 */
export async function deleteExpense(id: string): Promise<Expense | null> {
  const db = await openDb();
  const row = await db.getFirstAsync<ExpenseRow>(`SELECT * FROM ${TABLE_EXPENSES} WHERE id = ?`, [id]);
  if (!row) return null;
  const expense = mapExpense(row);

  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM ${TABLE_EXPENSES} WHERE id = ?`, [id]);
    await db.runAsync(`UPDATE ${TABLE_ASSETS} SET value = value + ? WHERE id = ?`, [
      expense.amount,
      expense.accountId,
    ]);
  });

  return expense;
}

/**
 * 改一笔支出的金额与备注：差额同步进出账户余额（同一事务）。
 * 账户与日期不可改——要换就删了重记，保持流水简单可信。
 */
export async function updateExpense(
  id: string,
  amount: number,
  note: string,
): Promise<Expense | null> {
  const db = await openDb();
  const row = await db.getFirstAsync<ExpenseRow>(`SELECT * FROM ${TABLE_EXPENSES} WHERE id = ?`, [id]);
  if (!row) return null;
  const expense = mapExpense(row);
  const next = Math.abs(amount);

  await db.withTransactionAsync(async () => {
    await db.runAsync(`UPDATE ${TABLE_EXPENSES} SET amount = ?, note = ? WHERE id = ?`, [
      next,
      note,
      id,
    ]);
    const diff = next - expense.amount;
    if (diff !== 0) {
      await db.runAsync(`UPDATE ${TABLE_ASSETS} SET value = value - ? WHERE id = ?`, [
        diff,
        expense.accountId,
      ]);
    }
  });

  return { ...expense, amount: next, note };
}

// —— 汇率 ——

export async function listRates(): Promise<Rate[]> {
  const db = await openDb();
  const rows = await db.getAllAsync<RateRow>(`SELECT * FROM ${TABLE_RATES} ORDER BY currency`);
  return rows.map(mapRate);
}

export async function upsertRate(currency: string, toCny: number): Promise<Rate> {
  const db = await openDb();
  await db.runAsync(`INSERT OR REPLACE INTO ${TABLE_RATES} (currency, to_cny) VALUES (?, ?)`, [
    currency,
    toCny,
  ]);
  return { currency, toCny };
}

export async function deleteRate(currency: string): Promise<void> {
  const db = await openDb();
  await db.runAsync(`DELETE FROM ${TABLE_RATES} WHERE currency = ?`, [currency]);
}

// —— 设置（meta）——

export async function getBaseCurrency(): Promise<string> {
  const db = await openDb();
  const row = await db.getFirstAsync<MetaRow>(
    `SELECT * FROM ${TABLE_META} WHERE meta_key = ?`,
    [META_BASE_CURRENCY],
  );
  return row?.meta_value ?? BASE_CURRENCY;
}

export async function setBaseCurrency(currency: string): Promise<void> {
  const db = await openDb();
  await db.runAsync(`INSERT OR REPLACE INTO ${TABLE_META} (meta_key, meta_value) VALUES (?, ?)`, [
    META_BASE_CURRENCY,
    currency,
  ]);
}

// —— 月度预算 ——

/** 返回 null 表示没设过。 */
export async function getMonthlyBudget(): Promise<number | null> {
  const db = await openDb();
  const row = await db.getFirstAsync<MetaRow>(
    `SELECT * FROM ${TABLE_META} WHERE meta_key = ?`,
    [META_MONTHLY_BUDGET],
  );
  if (!row) return null;
  const n = Number(row.meta_value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function setMonthlyBudget(cny: number | null): Promise<void> {
  const db = await openDb();
  if (cny == null || !(cny > 0)) {
    await db.runAsync(`DELETE FROM ${TABLE_META} WHERE meta_key = ?`, [META_MONTHLY_BUDGET]);
    return;
  }
  await db.runAsync(`INSERT OR REPLACE INTO ${TABLE_META} (meta_key, meta_value) VALUES (?, ?)`, [
    META_MONTHLY_BUDGET,
    String(cny),
  ]);
}

// —— 每日净值快照 ——

interface SnapshotRow {
  id: string;
  date: string;
  total_cny: number;
}

/** 最近 limit 天的快照，按日期正序（旧 → 新）。 */
export async function listSnapshots(limit = 30): Promise<Snapshot[]> {
  const db = await openDb();
  const rows = await db.getAllAsync<SnapshotRow>(
    `SELECT * FROM ${TABLE_SNAPSHOTS} ORDER BY date DESC LIMIT ?`,
    [limit],
  );
  return rows
    .reverse()
    .map((r) => ({ id: r.id, date: r.date, totalCny: r.total_cny }));
}

/** 当天快照写成当天最新净值：一行一天，同日重写（id = 日期）。 */
export async function upsertTodaySnapshot(totalCny: number): Promise<Snapshot> {
  const db = await openDb();
  const date = todayKey();
  await db.runAsync(
    `INSERT OR REPLACE INTO ${TABLE_SNAPSHOTS} (id, date, total_cny) VALUES (?, ?, ?)`,
    [date, date, totalCny],
  );
  return { id: date, date, totalCny };
}

// —— 导出 / 导入 ——

/** 备份文件的全部内容（JSON 结构）。version 用于将来格式升级时兼容判断。 */
export interface BackupPayload {
  app: 'assetbook';
  version: 1;
  exportedAt: string;
  assets: AssetItem[];
  expenses: Expense[];
  rates: Rate[];
  snapshots: Snapshot[];
  meta: {
    baseCurrency: string;
    monthlyBudgetCny: number | null;
  };
}

/** 导出整本账（资产 / 支出 / 汇率 / 快照 / 设置）。 */
export async function exportAll(): Promise<BackupPayload> {
  const db = await openDb();
  const [assets, expenses, rates, snapshots] = await Promise.all([
    listAssets(),
    listExpenses(),
    listRates(),
    listSnapshots(1000),
  ]);
  const [baseRow, budgetRow] = await Promise.all([
    db.getFirstAsync<MetaRow>(`SELECT * FROM ${TABLE_META} WHERE meta_key = ?`, [META_BASE_CURRENCY]),
    db.getFirstAsync<MetaRow>(`SELECT * FROM ${TABLE_META} WHERE meta_key = ?`, [META_MONTHLY_BUDGET]),
  ]);
  const budget = budgetRow ? Number(budgetRow.meta_value) : null;
  return {
    app: 'assetbook',
    version: 1,
    exportedAt: new Date().toISOString(),
    assets,
    expenses,
    rates,
    snapshots,
    meta: {
      baseCurrency: baseRow?.meta_value ?? BASE_CURRENCY,
      monthlyBudgetCny: Number.isFinite(budget) && budget != null && budget > 0 ? budget : null,
    },
  };
}

/** 备份文件的结构校验：够宽松（只看必备键），坏文件给出人话错误。 */
export function assertBackupPayload(raw: unknown): BackupPayload {
  if (typeof raw !== 'object' || raw == null) throw new Error('不是有效的备份文件');
  const p = raw as Record<string, unknown>;
  if (p.app !== 'assetbook' || !Array.isArray(p.assets) || !Array.isArray(p.expenses)) {
    throw new Error('不是资产账本的备份文件');
  }
  return raw as BackupPayload;
}

/**
 * 导入 = 整本替换：一个事务里清空五张表再灌入备份内容（换机搬回场景）。
 * 失败即整体回滚，原账本不动。
 */
export async function importAll(payload: BackupPayload): Promise<void> {
  const db = await openDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM ${TABLE_EXPENSES}`);
    await db.runAsync(`DELETE FROM ${TABLE_ASSETS}`);
    await db.runAsync(`DELETE FROM ${TABLE_RATES}`);
    await db.runAsync(`DELETE FROM ${TABLE_SNAPSHOTS}`);
    await db.runAsync(`DELETE FROM ${TABLE_META} WHERE meta_key != ?`, [META_SEEDED]);

    for (const a of payload.assets) {
      // 手改过 / 旧版的备份可能带非法 type、group：type 兜底成 cash，group 一律由类型推导，
      // 否则资产页（只渲染 liquid/fixed 两组）会出现「净资产算了它、列表看不见它」的隐形资产。
      const t = a.type in TYPE_GROUP ? a.type : 'cash';
      const value = NEGATIVE_TYPES.includes(t) ? -Math.abs(a.value) : a.value;
      await db.runAsync(
        `INSERT OR REPLACE INTO ${TABLE_ASSETS}
           (id, name, value, currency, asset_group, type, photo_uri, icon_key, note, sort)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [a.id, a.name, value, a.currency, TYPE_GROUP[t], t, a.photoUri ?? null, a.iconKey ?? null, a.note ?? null, a.sort ?? 0],
      );
    }
    for (const e of payload.expenses) {
      await db.runAsync(
        `INSERT OR REPLACE INTO ${TABLE_EXPENSES} (id, amount, currency, note, date, account_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [e.id, e.amount, e.currency, e.note, e.date, e.accountId],
      );
    }
    for (const r of payload.rates) {
      await db.runAsync(`INSERT OR REPLACE INTO ${TABLE_RATES} (currency, to_cny) VALUES (?, ?)`, [
        r.currency,
        r.toCny,
      ]);
    }
    for (const s of payload.snapshots ?? []) {
      await db.runAsync(
        `INSERT OR REPLACE INTO ${TABLE_SNAPSHOTS} (id, date, total_cny) VALUES (?, ?, ?)`,
        [s.id, s.date, s.totalCny],
      );
    }
    await db.runAsync(`INSERT OR REPLACE INTO ${TABLE_META} (meta_key, meta_value) VALUES (?, ?)`, [
      META_BASE_CURRENCY,
      payload.meta?.baseCurrency ?? BASE_CURRENCY,
    ]);
    const budget = payload.meta?.monthlyBudgetCny;
    if (budget != null && budget > 0) {
      await db.runAsync(`INSERT OR REPLACE INTO ${TABLE_META} (meta_key, meta_value) VALUES (?, ?)`, [
        META_MONTHLY_BUDGET,
        String(budget),
      ]);
    }
  });
}

// —— 清空 ——

/**
 * 清空所有数据（资产 / 支出 / 快照 / 预算），汇率复位成只剩人民币 1，基准币种复位为 CNY。
 * 同时把 seeded 置为 '1'，避免下次打开又被内置数据填满。
 * 保留 CNY 那行汇率，账本清空后「我的」页依然可读、可联网更新。
 */
export async function clearAll(): Promise<void> {
  const db = await openDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM ${TABLE_EXPENSES}`);
    await db.runAsync(`DELETE FROM ${TABLE_ASSETS}`);
    await db.runAsync(`DELETE FROM ${TABLE_SNAPSHOTS}`);
    await db.runAsync(`DELETE FROM ${TABLE_RATES}`);
    await db.runAsync(`INSERT OR REPLACE INTO ${TABLE_RATES} (currency, to_cny) VALUES (?, ?)`, [
      BASE_CURRENCY,
      1,
    ]);
    await db.runAsync(`DELETE FROM ${TABLE_META} WHERE meta_key = ?`, [META_MONTHLY_BUDGET]);
    await db.runAsync(`INSERT OR REPLACE INTO ${TABLE_META} (meta_key, meta_value) VALUES (?, ?)`, [
      META_BASE_CURRENCY,
      BASE_CURRENCY,
    ]);
    await db.runAsync(`INSERT OR REPLACE INTO ${TABLE_META} (meta_key, meta_value) VALUES (?, ?)`, [
      META_SEEDED,
      '1',
    ]);
  });
}
