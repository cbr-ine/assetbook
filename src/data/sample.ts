import type { AssetItem, Expense, NetWorthSummary, Rate } from './types';

/**
 * 示例数据。
 * 正式 App 首次启动是空白账本（走引导页），只写一份内置汇率表（sampleRates）；
 * 资产与支出这两组留在这里给网页预览端与调试取用，App 本身不再灌入。
 */

export const BASE_CURRENCY = 'CNY';

/** 首次启动写入的内置汇率：1 单位外币 = ? 人民币。与网页预览端保持同一套。 */
export const sampleRates: Rate[] = [
  { currency: 'CNY', toCny: 1 },
  { currency: 'USD', toCny: 7.1 },
  { currency: 'HKD', toCny: 0.91 },
  { currency: 'EUR', toCny: 7.72 },
  { currency: 'JPY', toCny: 0.0475 },
  { currency: 'GBP', toCny: 9.05 },
  { currency: 'SGD', toCny: 5.28 },
  { currency: 'TWD', toCny: 0.216 },
  { currency: 'KRW', toCny: 0.0049 },
  { currency: 'THB', toCny: 0.198 },
  { currency: 'AUD', toCny: 4.68 },
  { currency: 'CAD', toCny: 4.72 },
];

export const sampleAssets: AssetItem[] = [
  // —— 可流动现金等值物 ——
  { id: 'a1', name: '招商银行储蓄卡', value: 268400, currency: 'CNY', group: 'liquid', type: 'debit' },
  { id: 'a2', name: '微信零钱', value: 3215, currency: 'CNY', group: 'liquid', type: 'ewallet' },
  { id: 'a3', name: '支付宝余额', value: 8760, currency: 'CNY', group: 'liquid', type: 'ewallet' },
  { id: 'a4', name: '美元活期', value: 12000, currency: 'USD', group: 'liquid', type: 'debit', note: '境外账户' },
  { id: 'a5', name: '借出款·老周', value: 100000, currency: 'CNY', group: 'liquid', type: 'receivable', note: '2026-06 借出，年底归还' },
  { id: 'a6', name: '信用卡待还', value: -12000, currency: 'CNY', group: 'liquid', type: 'credit' },
  { id: 'a11', name: '公交储值卡', value: 80, currency: 'CNY', group: 'liquid', type: 'stored' },
  { id: 'a12', name: '花呗待还', value: -1560, currency: 'CNY', group: 'liquid', type: 'credit' },
  { id: 'a13', name: '券商账户', value: 45300, currency: 'CNY', group: 'liquid', type: 'investment' },
  // —— 固定资产与实物 ——
  { id: 'a7', name: '自住房产', value: 620000, currency: 'CNY', group: 'fixed', type: 'physical' },
  { id: 'a8', name: '代步车', value: 128000, currency: 'CNY', group: 'fixed', type: 'physical' },
  { id: 'a10', name: '黄金积存', value: 26000, currency: 'CNY', group: 'fixed', type: 'physical' },
];

/** 相对今天偏移 off 天的本地日期串（YYYY-MM-DD），避免 toISOString 的 UTC 偏移。 */
function isoDaysAgo(off: number): string {
  const t = new Date();
  const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() - off);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** [几天前, 金额, 备注, 账户 id] */
const EXPENSE_ROWS: Array<[number, number, string, string]> = [
  [13, 128, '超市采购', 'a1'],
  [12, 60, '咖啡', 'a2'],
  [10, 245, '加油', 'a1'],
  [9, 88, '打车', 'a2'],
  [8, 40, '便利店', 'a3'],
  [7, 312, '家电维修', 'a1'],
  [6, 76, '水果', 'a2'],
  [5, 55, '早餐', 'a2'],
  [4, 190, '网购·日用', 'a3'],
  [3, 42, '奶茶', 'a2'],
  [1, 168, '晚餐·朋友', 'a1'],
  [0, 224, '话费+宽带', 'a1'],
];

/** 支出币种跟随账户（这里示例账户都是人民币，留着结构以便拓展外币账户）。 */
const EXPENSE_ACCOUNT_CCY: Record<string, string> = { a1: 'CNY', a2: 'CNY', a3: 'CNY', a4: 'USD' };

export const sampleExpenses: Expense[] = EXPENSE_ROWS.map(([off, amount, note, accountId], i) => ({
  id: `e${i + 1}`,
  amount,
  currency: EXPENSE_ACCOUNT_CCY[accountId] ?? 'CNY',
  note,
  accountId,
  date: isoDaysAgo(off),
}));

/** 最近 14 天每日支出，用于主页趋势线（示例） */
export const sampleDailySpend: number[] = [128, 60, 0, 245, 88, 40, 312, 76, 55, 190, 42, 0, 168, 224];

/** 把资产项按汇率折算成人民币 */
export function toCny(value: number, currency: string, rates: Rate[]): number {
  const rate = rates.find((r) => r.currency === currency)?.toCny ?? 1;
  return value * rate;
}

/** 把人民币金额折算成基准币种的展示数值（净值折人民币后再按基准币种换算回去）。 */
export function cnyToBase(cny: number, baseCurrency: string, rates: Rate[]): number {
  const rate = rates.find((r) => r.currency === baseCurrency)?.toCny ?? 1;
  return cny / (rate || 1);
}

/** 1 单位该币种 = 多少基准币种；用于「≈ 折算」的整行换算。 */
export function baseValueOf(value: number, currency: string, baseCurrency: string, rates: Rate[]): number {
  return cnyToBase(toCny(value, currency, rates), baseCurrency, rates);
}

/** 汇总净资产。应付项本身就是负值，直接加总即可。 */
export function summarize(
  assets: AssetItem[],
  rates: Rate[],
  baseCurrency = BASE_CURRENCY,
): NetWorthSummary {
  let liquid = 0;
  let fixed = 0;
  for (const a of assets) {
    const cny = toCny(a.value, a.currency, rates);
    if (a.group === 'liquid') liquid += cny;
    else fixed += cny;
  }
  return { net: liquid + fixed, liquid, fixed, baseCurrency };
}
