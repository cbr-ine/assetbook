/** 金额与日期格式化工具（不依赖 Intl，兼容 Hermes）。 */

import { currencySymbol } from '../data/currencies';

// 币种符号集中在 data/currencies.ts，这里转出以保持既有 import 不变。
export { currencySymbol } from '../data/currencies';

function group(abs: number): string {
  const hasCent = Math.round(abs * 100) % 100 !== 0;
  return abs.toLocaleString('en-US', {
    minimumFractionDigits: hasCent ? 2 : 0,
    maximumFractionDigits: 2,
  });
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

/** "2026-10-14" -> "10月14日" */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/** "2026-10-14" -> "2026 年 10 月 14 日" */
export function formatFullDate(iso: string): string {
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
