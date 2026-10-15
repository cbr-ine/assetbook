/**
 * 币种字典：代码、中文名、符号。与网页预览端 preview/app.js 的 CURRENCIES 一一对应。
 * 汇率存的是「1 单位外币 = ? 人民币」，字典只负责展示，实际折算走 data/sample.ts 的 toCny。
 */

export interface CurrencyInfo {
  code: string;
  name: string;
  sym: string;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'CNY', name: '人民币', sym: '¥' },
  { code: 'USD', name: '美元', sym: '$' },
  { code: 'HKD', name: '港币', sym: 'HK$' },
  { code: 'EUR', name: '欧元', sym: '€' },
  { code: 'JPY', name: '日元', sym: '¥' },
  { code: 'GBP', name: '英镑', sym: '£' },
  { code: 'SGD', name: '新加坡元', sym: 'S$' },
  { code: 'TWD', name: '新台币', sym: 'NT$' },
  { code: 'KRW', name: '韩元', sym: '₩' },
  { code: 'AUD', name: '澳元', sym: 'A$' },
  { code: 'CAD', name: '加元', sym: 'C$' },
  { code: 'CHF', name: '瑞士法郎', sym: 'CHF ' },
  { code: 'NZD', name: '新西兰元', sym: 'NZ$' },
  { code: 'MOP', name: '澳门元', sym: 'MOP$' },
  { code: 'THB', name: '泰铢', sym: '฿' },
  { code: 'MYR', name: '林吉特', sym: 'RM ' },
  { code: 'PHP', name: '菲律宾比索', sym: '₱' },
  { code: 'IDR', name: '印尼盾', sym: 'Rp ' },
  { code: 'VND', name: '越南盾', sym: '₫' },
  { code: 'INR', name: '印度卢比', sym: '₹' },
  { code: 'RUB', name: '卢布', sym: '₽' },
  { code: 'AED', name: '阿联酋迪拉姆', sym: 'AED ' },
  { code: 'SAR', name: '沙特里亚尔', sym: 'SAR ' },
  { code: 'TRY', name: '土耳其里拉', sym: '₺' },
  { code: 'BRL', name: '巴西雷亚尔', sym: 'R$' },
  { code: 'MXN', name: '墨西哥比索', sym: 'MX$' },
  { code: 'ZAR', name: '南非兰特', sym: 'R ' },
  { code: 'SEK', name: '瑞典克朗', sym: 'kr ' },
  { code: 'NOK', name: '挪威克朗', sym: 'kr ' },
  { code: 'DKK', name: '丹麦克朗', sym: 'kr ' },
  { code: 'USDT', name: '泰达币', sym: '₮' },
];

const SYMBOL: Record<string, string> = Object.fromEntries(CURRENCIES.map((c) => [c.code, c.sym]));
const NAME: Record<string, string> = Object.fromEntries(CURRENCIES.map((c) => [c.code, c.name]));

export function currencySymbol(code: string): string {
  return SYMBOL[code] ?? `${code} `;
}

export function currencyName(code: string): string {
  return NAME[code] ?? code;
}
