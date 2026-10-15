import * as SQLite from 'expo-sqlite';

import { BASE_CURRENCY, sampleRates } from './sample';
import {
  CREATE_INDEXES_SQL,
  CREATE_TABLES_SQL,
  DROP_TABLES_SQL,
  META_BASE_CURRENCY,
  META_SEEDED,
  TABLE_ASSETS,
  TABLE_META,
  TABLE_RATES,
} from './schema';

/**
 * 数据库连接与初始化（expo-sqlite，SDK 52 的 openDatabaseAsync 风格）。
 * 单例：全 app 共用一个连接，openDb() 可被反复调用而只打开一次。
 */

const DB_NAME = 'assetbook.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** 打开（或复用）数据库；首次运行时建表并写入内置汇率表。 */
export function openDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = initDb().catch((err) => {
      // 失败不缓存，否则「重试」永远拿到同一个失败的 promise
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

async function initDb(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync(CREATE_TABLES_SQL);
  await db.execAsync(CREATE_INDEXES_SQL);
  await migrate(db);
  await seedIfNeeded(db);
  return db;
}

/** 旧库补列：icon_key 是类目图标的手选覆盖，空着走名称匹配。 */
async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${TABLE_ASSETS})`);
  if (!cols.some((c) => c.name === 'icon_key')) {
    await db.execAsync(`ALTER TABLE ${TABLE_ASSETS} ADD COLUMN icon_key TEXT`);
  }
}

/**
 * 只在从未初始化过时写一次内置数据，用 meta.seeded 标志守住。
 * 注意：首次启动写的是**汇率表**（1 单位外币 = ? 人民币），不是资产 / 支出 ——
 * 账本从空白开始走引导，只有示例汇率留着，好让「我的」页与联网更新立刻可用。
 */
async function seedIfNeeded(db: SQLite.SQLiteDatabase): Promise<void> {
  const flag = await db.getFirstAsync<{ meta_value: string }>(
    `SELECT meta_value FROM ${TABLE_META} WHERE meta_key = ?`,
    [META_SEEDED],
  );
  if (flag?.meta_value === '1') return;

  await db.withTransactionAsync(async () => {
    for (const r of sampleRates) {
      await db.runAsync(
        `INSERT OR REPLACE INTO ${TABLE_RATES} (currency, to_cny) VALUES (?, ?)`,
        [r.currency, r.toCny],
      );
    }
    await db.runAsync(
      `INSERT OR REPLACE INTO ${TABLE_META} (meta_key, meta_value) VALUES (?, ?)`,
      [META_SEEDED, '1'],
    );
    await db.runAsync(
      `INSERT OR REPLACE INTO ${TABLE_META} (meta_key, meta_value) VALUES (?, ?)`,
      [META_BASE_CURRENCY, BASE_CURRENCY],
    );
  });
}

/** 整库重置：删表重建并重新写入内置汇率（开发 / 调试用）。 */
export async function resetDb(): Promise<void> {
  const db = await openDb();
  await db.execAsync(DROP_TABLES_SQL);
  await db.execAsync(CREATE_TABLES_SQL);
  await db.execAsync(CREATE_INDEXES_SQL);
  await seedIfNeeded(db);
}
