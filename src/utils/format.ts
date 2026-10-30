/** 金额与日期格式化工具（不依赖 Intl，兼容 Hermes）。 */

import { currencySymbol } from '../data/currencies';

// 币种符号集中在 data/currencies.ts，这里转出以保持既有 import 不变。
export { currencySymbol } from '../data/currencies';

/** 金额统一取到「分」（两位小数）。扣款/回滚等浮点运算的残渣（0.1+0.2 型）到此为止。 */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * 手写千分位 + 分位截断：不用 toLocaleString 的选项 —— Hermes 上 Intl 选项
 * 可能整个不生效，浮点残渣（-0.30000000000000004）会原样漏出。
 * 1234567.899 -> "1,234,567.90"；整数不带小数：1000 -> "1,000"。
 */
function group(abs: number): string {
  const cents = Math.round(abs * 100);
  const int = Math.trunc(cents / 100);
  const frac = Math.abs(cents % 100);
  const grouped = String(int).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac === 0 ? grouped : `${grouped}.${String(frac).padStart(2, '0')}`;
}

/** 纯数字（带千分位）：1272875 -> "1,272,875" */
export function formatNumber(value: number): string {
  return `${value < 0 ? '-' : ''}${group(Math.abs(value))}`;
}

/** 1234.5 -> "¥1,234.5"；整数不显示小数 */
export function formatMoney(value: number, currency = 'CNY'): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}${currencySymbol(currency)}${group(Math.abs(value))}`;
}

/** 带显式正负号，用于收支列表：+¥120 / -¥38 */
export function formatSigned(value: number, currency = 'CNY'): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${formatMoney(Math.abs(value), currency)}`;
}

/** 固定两位小数，用于对账单式金额：38 -> "38.00" */
export function formatFixed(value: number): string {
  return formatNumber(Math.round(Math.abs(value) * 100) / 100);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** 某年某月里账期起始日的落点（31 日落在短月时贴到月末）。月份可越界（-1 = 上年 12 月）。 */
export function cycleDayOf(year: number, month: number, billingDay: number): Date {
  const day = Math.min(Math.max(Math.round(billingDay) || 1, 1), 31);
  return new Date(year, month, Math.min(day, daysInMonth(year, month)));
}

/**
 * 账期起点：不晚于 now 的最近一个「起始日」（短月自动贴到月末）。
 * 起始日 14：10 月 20 日 → 10 月 14 日；10 月 5 日 → 9 月 14 日。
 * 起始日 31：3 月 15 日 → 2 月 28 日（2 月没有 31 日，贴月末）。
 * 起始日 1 就是自然月，与旧口径完全一致。
 */
export function billingCycleStart(now: Date, billingDay: number): Date {
  const start = cycleDayOf(now.getFullYear(), now.getMonth(), billingDay);
  return start.getTime() <= now.getTime()
    ? start
    : cycleDayOf(now.getFullYear(), now.getMonth() - 1, billingDay);
}

/** 账期的最后一天（含）：下一期起点的前一天。与 billingCycleStart 的贴月末规则同一套，首尾严丝合缝。 */
export function billingCycleEnd(start: Date, billingDay: number): Date {
  const next = cycleDayOf(start.getFullYear(), start.getMonth() + 1, billingDay);
  return new Date(next.getTime() - 24 * 60 * 60 * 1000);
}

/** 抽出 ISO 串的年月日。new Date("YYYY-MM-DD") 是按 UTC 解析的，
 *  西半球时区会掉到前一天（快照 id 全是这种日期串），所以手工解析。 */
function ymd(iso: string): { y: number; m: number; d: number } | null {
  const hit = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return hit ? { y: Number(hit[1]), m: Number(hit[2]), d: Number(hit[3]) } : null;
}

/** "2026-10-14" -> "10月14日" */
export function formatDate(iso: string): string {
  const parts = ymd(iso);
  if (parts) return `${parts.m}月${parts.d}日`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}`;
}

/** "2026-10-14" -> "2026 年 10 月 14 日" */
export function formatFullDate(iso: string): string {
  const parts = ymd(iso);
  if (parts) return `${parts.y} 年 ${parts.m} 月 ${parts.d} 日`;
  const d = new Date(iso);
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

/** 相对时间：今天 / 昨天 / 10月12日 */
export function formatRelativeDay(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diff = Math.round((b - a) / day);
  if (diff === 0) return '今天';
  if (diff === 1) return '昨天';
  return formatDate(iso);
}
