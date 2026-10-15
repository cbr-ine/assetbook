/**
 * 资产类目图标目录。
 * 品牌用 App Store 官方图标（内置位图）；现金是自绘钞票块；固定资产 / 乐器是 lucide 墨线。
 * 未手选时按名称关键词匹配，匹配不到再按类型兜底 —— 不写库，改名即跟着变。
 */

export type IconKind = 'brand' | 'note' | 'line';

export type IconGroup =
  | 'ewallet'
  | 'cn-bank'
  | 'hk-bank'
  | 'broker'
  | 'cash'
  | 'physical'
  | 'instrument';

export interface IconEntry {
  id: string;
  label: string;
  kind: IconKind;
  group: IconGroup;
  keywords: string[];
  /** kind=brand：require() 的模块 id */
  source?: number;
  /** kind=note：ISO 币种代码，用来取符号 */
  code?: string;
  /** kind=note：钞票描边色 */
  color?: string;
  /** kind=line：lucide 组件名，由 AssetIcon 映射 */
  lucide?: string;
}

const BRAND: Record<string, number> = {
  wechat: require('../../assets/seals/wechat.png'),
  alipay: require('../../assets/seals/alipay.png'),
  octopus: require('../../assets/seals/octopus.png'),
  icbc: require('../../assets/seals/icbc.png'),
  ccb: require('../../assets/seals/ccb.png'),
  abc: require('../../assets/seals/abc.png'),
  boc: require('../../assets/seals/boc.png'),
  cmb: require('../../assets/seals/cmb.png'),
  psbc: require('../../assets/seals/psbc.png'),
  bocom: require('../../assets/seals/bocom.png'),
  hsbc: require('../../assets/seals/hsbc.png'),
  hangseng: require('../../assets/seals/hangseng.png'),
  sc: require('../../assets/seals/sc.png'),
  bochk: require('../../assets/seals/bochk.png'),
  bea: require('../../assets/seals/bea.png'),
  empf: require('../../assets/seals/empf.png'),
  futu: require('../../assets/seals/futu.png'),
  tiger: require('../../assets/seals/tiger.png'),
  moomoo: require('../../assets/seals/moomoo.png'),
};

function brand(id: string, label: string, group: IconGroup, keywords: string[]): IconEntry {
  return { id, label, kind: 'brand', group, keywords, source: BRAND[id] };
}

function note(code: string, label: string, color: string, keywords: string[]): IconEntry {
  return { id: `cash-${code}`, label, kind: 'note', group: 'cash', keywords, code, color };
}

function line(id: string, label: string, lucide: string, group: IconGroup, keywords: string[]): IconEntry {
  return { id, label, kind: 'line', group, keywords, lucide };
}

export const ICONS: IconEntry[] = [
  // —— 电子钱包 ——
  brand('wechat', '微信支付', 'ewallet', ['微信支付', '微信零钱', '微信', 'wechat', 'weixin']),
  brand('alipay', '支付宝', 'ewallet', ['支付宝', 'alipay', '蚂蚁']),
  brand('octopus', '八达通', 'ewallet', ['八达通', '八達通', 'octopus']),

  // —— 中国银行（长词在前，避免「中行」抢「中银香港」）——
  brand('icbc', '工商银行', 'cn-bank', ['工商银行', '工商', '工行', 'icbc']),
  brand('ccb', '建设银行', 'cn-bank', ['建设银行', '建设', '建行', 'ccb']),
  brand('abc', '农业银行', 'cn-bank', ['农业银行', '农业', '农行', 'abc']),
  brand('boc', '中国银行', 'cn-bank', ['中国银行', '中行']),
  brand('cmb', '招商银行', 'cn-bank', ['招商银行', '招商', '招行', 'cmb']),
  brand('psbc', '邮储银行', 'cn-bank', ['邮储银行', '邮储', '邮政储蓄', 'psbc']),
  brand('bocom', '交通银行', 'cn-bank', ['交通银行', '交通', '交行', 'bocom']),

  // —— 香港银行 / 强积金 ——
  brand('bochk', '中银香港', 'hk-bank', ['中银香港', '中銀香港', 'bochk']),
  brand('hsbc', '汇丰', 'hk-bank', ['汇丰', '匯豐', 'hsbc']),
  brand('hangseng', '恒生', 'hk-bank', ['恒生', '恆生', 'hang seng', 'hangseng']),
  brand('sc', '渣打', 'hk-bank', ['渣打', 'standard chartered']),
  brand('bea', '东亚银行', 'hk-bank', ['东亚银行', '東亞銀行', '东亚', '東亞', 'bea']),
  brand('empf', '强积金', 'hk-bank', ['强积金', '強積金', '积金易', '積金易', 'empf', 'mpf', 'mpfa']),

  // —— 券商 ——
  brand('futu', '富途牛牛', 'broker', ['富途牛牛', '富途', '牛牛', 'futu', 'futubull']),
  brand('tiger', '老虎证券', 'broker', ['老虎证券', '老虎證券', '老虎', 'tiger trade', 'tiger']),
  brand('moomoo', 'moomoo', 'broker', ['moomoo']),

  // —— 现金（每个币种一张钞票块）——
  note('CNY', '人民币', '#B3241C', ['人民币', '人民幣', 'cny', 'rmb']),
  note('USD', '美元', '#3E7C4F', ['美元', '美金', 'usd']),
  note('HKD', '港币', '#C8102E', ['港币', '港幣', '港元', 'hkd']),
  note('EUR', '欧元', '#2B4C9B', ['欧元', '歐元', 'eur']),
  note('JPY', '日元', '#8A6D3B', ['日元', '日圆', 'jpy']),
  note('GBP', '英镑', '#6B4E9B', ['英镑', '英鎊', 'gbp']),
  note('SGD', '新加坡元', '#3C5AA6', ['新加坡元', '新币', 'sgd']),
  note('TWD', '新台币', '#A34A2E', ['新台币', '新臺幣', '台币', 'twd']),
  note('KRW', '韩元', '#9B7B3A', ['韩元', '韓元', 'krw']),
  note('AUD', '澳元', '#1F6E5C', ['澳元', '澳币', 'aud']),
  note('CAD', '加元', '#C23B2E', ['加元', '加币', 'cad']),
  note('CHF', '瑞郎', '#B5455A', ['瑞郎', '瑞士法郎', 'chf']),
  note('NZD', '新西兰元', '#2E5E8C', ['新西兰元', '纽元', 'nzd']),
  note('MOP', '澳门元', '#6B5B95', ['澳门元', '澳門元', 'mop']),
  note('THB', '泰铢', '#5C6B7A', ['泰铢', '泰銖', 'thb']),
  note('MYR', '林吉特', '#55707F', ['林吉特', '马来西亚', 'myr']),
  note('PHP', '菲律宾比索', '#3B6EA5', ['菲律宾', '比索', 'php']),
  note('IDR', '印尼盾', '#B0452E', ['印尼盾', '印尼', 'idr']),
  note('VND', '越南盾', '#B08A3E', ['越南盾', '越南', 'vnd']),
  note('INR', '印度卢比', '#5E7A5E', ['卢比', '印度', 'inr']),
  note('RUB', '卢布', '#6E7B8B', ['卢布', '盧布', 'rub']),
  note('AED', '迪拉姆', '#4E7A9B', ['迪拉姆', 'aed']),
  note('SAR', '里亚尔', '#3E7C5F', ['里亚尔', 'sar']),
  note('TRY', '里拉', '#A5463B', ['里拉', 'try']),
  note('BRL', '雷亚尔', '#3E7C4F', ['雷亚尔', 'brl']),
  note('MXN', '墨比索', '#7A5C3A', ['墨西哥', 'mxn']),
  note('ZAR', '兰特', '#8C5A3B', ['兰特', 'zar']),
  note('SEK', '瑞典克朗', '#4A6E8C', ['瑞典克朗', 'sek']),
  note('NOK', '挪威克朗', '#5C7B4E', ['挪威克朗', 'nok']),
  note('DKK', '丹麦克朗', '#8C6D46', ['丹麦克朗', 'dkk']),
  note('USDT', '泰达币', '#26A17B', ['泰达', 'tether', 'usdt']),

  // —— 固定资产（大件 / 数码 / 出行 / 保值）——
  line('house', '房子', 'House', 'physical', ['房子', '房产', '房屋', '住宅', 'apartment', 'house']),
  line('car', '车子', 'CarFront', 'physical', ['车子', '汽车', '汽車', '轿车', '代步车', 'car']),
  line('parking', '车位', 'CircleParking', 'physical', ['车位', '车位', '停车位', '車位']),
  line('tv', '电视', 'TvMinimal', 'physical', ['电视', '電視', '电视机']),
  line('fridge', '冰箱', 'Refrigerator', 'physical', ['冰箱']),
  line('sofa', '沙发', 'Sofa', 'physical', ['沙发', '沙發']),
  line('robotvac', '扫地机器人', 'Bot', 'physical', ['扫地', '扫地机器人', '扫地机']),
  line('laptop', '电脑', 'Laptop', 'physical', ['电脑', '電腦', '笔记本', 'macbook', 'laptop']),
  line('phone', '手机', 'Smartphone', 'physical', ['手机', '手機', 'iphone', 'phone']),
  line('tablet', '平板', 'Tablet', 'physical', ['平板', 'ipad', 'tablet']),
  line('camera', '相机', 'Camera', 'physical', ['相机', '相機', '单反', '微单']),
  line('lens', '镜头', 'Aperture', 'physical', ['镜头', '鏡頭']),
  line('drone', '无人机', 'Drone', 'physical', ['无人机', '無人機', 'drone']),
  line('console', '游戏主机', 'Gamepad2', 'physical', ['游戏机', '游戏主机', 'switch', 'ps5', 'xbox']),
  line('pencil', '手写笔', 'Pencil', 'physical', ['手写笔', 'pencil', 'apple pencil']),
  line('earbuds', '无线耳机', 'Headphones', 'physical', ['耳机', '耳機', 'airpods', 'buds']),
  line('watch', '智能手表', 'Watch', 'physical', ['手表', '智能手表', 'iwatch', 'watch']),
  line('keyboard', '机械键盘', 'Keyboard', 'physical', ['键盘', '鍵盤', '机械键盘']),
  line('ereader', '电纸书', 'BookOpen', 'physical', ['电纸书', '电纸', 'kindle']),
  line('speaker', '音箱', 'Speaker', 'physical', ['音箱', '音响', '音響']),
  line('projector', '投影仪', 'Projector', 'physical', ['投影', '投影仪']),
  line('vr', 'VR 头显', 'Glasses', 'physical', ['vr', '头显', 'vision pro']),
  line('ebike', '摩托/电驴', 'Motorbike', 'physical', ['摩托', '电驴', '电动车', '電單車', '电瓶车']),
  line('bicycle', '自行车', 'Bike', 'physical', ['自行车', '單車', '公路车', '山地车']),
  line('bag', '名牌包', 'ShoppingBag', 'physical', ['名牌包', '手袋', '皮包', 'lv', 'hermes', '香奈儿']),
  line('jewelry', '珠宝首饰', 'Gem', 'physical', ['珠宝', '首饰', '戒指', '项链', '钻石']),
  line('gold', '金条', 'Coins', 'physical', ['金条', '黄金', '金饰', 'gold']),

  // —— 乐器 ——
  line('guitar', '吉他', 'Guitar', 'instrument', ['吉他', 'guitar', '贝斯', 'bass']),
  line('piano', '钢琴', 'Piano', 'instrument', ['钢琴', '鋼琴', 'piano']),
  line('keys', '电子琴', 'KeyboardMusic', 'instrument', ['电子琴', '电钢', '合成器', 'midi']),
  line('drum', '鼓', 'Drum', 'instrument', ['鼓', '架子鼓', 'drum']),
  line('mic', '麦克风', 'MicVocal', 'instrument', ['麦克风', '話筒', 'mic']),
  line('music', '乐器', 'Music', 'instrument', ['乐器', '樂器', '小提琴', '大提琴', '萨克斯', '长笛', '二胡']),
];

export const ICON_BY_ID: Record<string, IconEntry> = Object.fromEntries(ICONS.map((i) => [i.id, i]));

export const ICON_GROUP_META: { id: IconGroup; cn: string; latin: string }[] = [
  { id: 'ewallet', cn: '电子钱包', latin: 'E-WALLETS' },
  { id: 'cn-bank', cn: '中国银行', latin: 'CN BANKS' },
  { id: 'hk-bank', cn: '香港银行', latin: 'HK BANKS' },
  { id: 'broker', cn: '券商', latin: 'BROKERS' },
  { id: 'cash', cn: '现金', latin: 'CASH' },
  { id: 'physical', cn: '固定资产', latin: 'FIXED' },
  { id: 'instrument', cn: '乐器', latin: 'INSTRUMENTS' },
];

const TYPE_FALLBACK: Record<string, string> = {
  ewallet: 'wechat',
  credit: 'cmb',
  debit: 'icbc',
  investment: 'futu',
  cash: 'cash-CNY',
  stored: 'octopus',
  receivable: 'gold',
  payable: 'gold',
  physical: 'house',
};

/**
 * 解析该资产该亮哪枚图标：手选 > 名称最长关键词 > 类型兜底。
 * 手选存的是 iconKey；空着表示一直跟名称走。
 */
export function resolveIcon(input: {
  name: string;
  type: string;
  currency: string;
  iconKey?: string | null;
}): IconEntry {
  if (input.iconKey && ICON_BY_ID[input.iconKey]) return ICON_BY_ID[input.iconKey];

  const hay = input.name.toLowerCase();
  let best: { id: string; len: number } | null = null;
  for (const icon of ICONS) {
    for (const kw of icon.keywords) {
      if (!kw) continue;
      const k = kw.toLowerCase();
      if (hay.includes(k) && k.length > (best?.len ?? 0)) {
        best = { id: icon.id, len: k.length };
      }
    }
  }
  if (best) return ICON_BY_ID[best.id];

  if (input.type === 'cash') {
    const id = `cash-${input.currency}`;
    if (ICON_BY_ID[id]) return ICON_BY_ID[id];
  }
  const fb = TYPE_FALLBACK[input.type] ?? 'house';
  return ICON_BY_ID[fb] ?? ICONS[0];
}
