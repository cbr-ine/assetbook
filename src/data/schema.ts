/**
 * SQLite 建表语句（expo-sqlite，字符串常量）。
 * 表结构与 src/data/types.ts 一一对应；列名统一 snake_case，由 repo.ts 映射回驼峰。
 *
 * 约定：
 *  - assets 分组列用 asset_group 而不是 group（GROUP 是 SQL 保留字），映射回 AssetItem.group。
 *  - 金额统一存 REAL：本 app 只做展示级记账，小数精度足够，省去「分」换算的噪音。
 *  - meta 是 key/value 表，目前存 base_currency（计价基准币种）与 seeded（是否已灌示例数据）。
 *  - 删除资产项不回滚历史支出（支出仍指向旧 accountId，界面会显示「未知账户」），保持账目可追溯。
 */

export const TABLE_ASSETS = 'assets';
export const TABLE_EXPENSES = 'expenses';
export const TABLE_RATES = 'rates';
export const TABLE_META = 'meta';
/** 每日净值快照：一天一行（id 即日期），给净值走势用 */
export const TABLE_SNAPSHOTS = 'snapshots';

/** meta 表里用到的键 */
export const META_BASE_CURRENCY = 'base_currency';
export const META_SEEDED = 'seeded';
/** 月度预算（人民币计） */
export const META_MONTHLY_BUDGET = 'monthly_budget_cny';

export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS ${TABLE_ASSETS} (
  id          TEXT PRIMARY KEY NOT NULL,
  name        TEXT NOT NULL,
  value       REAL NOT NULL DEFAULT 0,
  currency    TEXT NOT NULL DEFAULT 'CNY',
  asset_group TEXT NOT NULL,
  type        TEXT NOT NULL,
  photo_uri   TEXT,
  icon_key    TEXT,
  note        TEXT,
  sort        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ${TABLE_EXPENSES} (
  id         TEXT PRIMARY KEY NOT NULL,
  amount     REAL NOT NULL,
  currency   TEXT NOT NULL,
  note       TEXT NOT NULL DEFAULT '',
  date       TEXT NOT NULL,
  account_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ${TABLE_RATES} (
  currency TEXT PRIMARY KEY NOT NULL,
  to_cny   REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS ${TABLE_META} (
  meta_key   TEXT PRIMARY KEY NOT NULL,
  meta_value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ${TABLE_SNAPSHOTS} (
  id        TEXT PRIMARY KEY NOT NULL,
  date      TEXT NOT NULL,
  total_cny REAL NOT NULL
);
`;

export const CREATE_INDEXES_SQL = `
CREATE INDEX IF NOT EXISTS idx_assets_group   ON ${TABLE_ASSETS}(asset_group);
CREATE INDEX IF NOT EXISTS idx_expenses_date  ON ${TABLE_EXPENSES}(date);
CREATE INDEX IF NOT EXISTS idx_expenses_acct  ON ${TABLE_EXPENSES}(account_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_date ON ${TABLE_SNAPSHOTS}(date);
`;

/** 建表 + 建索引，首次运行时一次执行 */
export const SCHEMA_SQL = `${CREATE_TABLES_SQL}\n${CREATE_INDEXES_SQL}`;

/** 整库重置用：按外键无关的顺序删表 */
export const DROP_TABLES_SQL = `
DROP TABLE IF EXISTS ${TABLE_ASSETS};
DROP TABLE IF EXISTS ${TABLE_EXPENSES};
DROP TABLE IF EXISTS ${TABLE_RATES};
DROP TABLE IF EXISTS ${TABLE_META};
DROP TABLE IF EXISTS ${TABLE_SNAPSHOTS};
`;
