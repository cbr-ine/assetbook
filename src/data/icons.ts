/**
 * 资产类目图标目录。
 * 品牌用 App Store 官方图标（内置位图，assets/seals）；现金是自绘钞票块；
 * 固定资产 / 乐器是手绘彩色小图（Illus）。
 * 未手选时按名称关键词匹配，匹配不到再按类型兜底 —— 不写库，改名即跟着变。
 * 自定义上传的图标不进这个目录：iconKey 形如 custom:<文件URI>，由 resolveIcon 单独解析。
 */

export type IconKind = 'brand' | 'note' | 'illus';

export type IconGroup =
  | 'ewallet'
  | 'cn-bank'
  | 'hk-bank'
  | 'broker'
  | 'crypto'
  | 'cash'
  | 'physical'
  | 'instrument';

export interface IconEntry {
  id: string;
  label: string;
  kind: IconKind;
  group: IconGroup;
  keywords: string[];
  /** kind=brand：require() 的模块 id，或自定义图标的 {uri} */
  source?: number | { uri: string };
  /** kind=note：ISO 币种代码，用来取符号 */
  code?: string;
  /** kind=note：钞票描边色 */
  color?: string;
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
  spdb: require('../../assets/seals/spdb.png'),
  'citic-bank': require('../../assets/seals/citic-bank.png'),
  cmbc: require('../../assets/seals/cmbc.png'),
  cib: require('../../assets/seals/cib.png'),
  ceb: require('../../assets/seals/ceb.png'),
  hxb: require('../../assets/seals/hxb.png'),
  pab: require('../../assets/seals/pab.png'),
  gdb: require('../../assets/seals/gdb.png'),
  hsbc: require('../../assets/seals/hsbc.png'),
  hangseng: require('../../assets/seals/hangseng.png'),
  sc: require('../../assets/seals/sc.png'),
  bochk: require('../../assets/seals/bochk.png'),
  bea: require('../../assets/seals/bea.png'),
  citi: require('../../assets/seals/citi.png'),
  dahsing: require('../../assets/seals/dahsing.png'),
  empf: require('../../assets/seals/empf.png'),
  futu: require('../../assets/seals/futu.png'),
  tiger: require('../../assets/seals/tiger.png'),
  moomoo: require('../../assets/seals/moomoo.png'),
  guosen: require('../../assets/seals/guosen.png'),
  citics: require('../../assets/seals/citics.png'),
  htsc: require('../../assets/seals/htsc.png'),
  gtja: require('../../assets/seals/gtja.png'),
  chinastock: require('../../assets/seals/chinastock.png'),
  eastmoney: require('../../assets/seals/eastmoney.png'),
  ths: require('../../assets/seals/ths.png'),
  binance: require('../../assets/seals/binance.png'),
  okx: require('../../assets/seals/okx.png'),
  htx: require('../../assets/seals/htx.png'),
  gateio: require('../../assets/seals/gateio.png'),
  bybit: require('../../assets/seals/bybit.png'),
};

function brand(id: string, label: string, group: IconGroup, keywords: string[]): IconEntry {
  return { id, label, kind: 'brand', group, keywords, source: BRAND[id] };
}

function note(code: string, label: string, color: string, keywords: string[]): IconEntry {
  return { id: `cash-${code}`, label, kind: 'note', group: 'cash', keywords, code, color };
}

/** 手绘彩色小图（房产 / 固定资产 / 乐器），由 Illus 按 id 渲染 */
function illus(id: string, label: string, group: IconGroup, keywords: string[]): IconEntry {
  return { id, label, kind: 'illus', group, keywords };
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
  brand('spdb', '浦发银行', 'cn-bank', ['浦发银行', '浦发', 'spdb']),
  brand('citic-bank', '中信银行', 'cn-bank', ['中信银行']),
  brand('cmbc', '民生银行', 'cn-bank', ['民生银行', '民生']),
  brand('cib', '兴业银行', 'cn-bank', ['兴业银行', '兴业']),
  brand('ceb', '光大银行', 'cn-bank', ['光大银行', '光大']),
  brand('hxb', '华夏银行', 'cn-bank', ['华夏银行', '华夏']),
  brand('pab', '平安银行', 'cn-bank', ['平安银行', '平安银行卡', '口袋银行']),
  brand('gdb', '广发银行', 'cn-bank', ['广发银行']),

  // —— 香港银行 / 强积金 ——
  brand('bochk', '中银香港', 'hk-bank', ['中银香港', '中銀香港', 'bochk']),
  brand('hsbc', '汇丰', 'hk-bank', ['汇丰', '匯豐', 'hsbc']),
  brand('hangseng', '恒生', 'hk-bank', ['恒生', '恆生', 'hang seng', 'hangseng']),
  brand('sc', '渣打', 'hk-bank', ['渣打', 'standard chartered']),
  brand('bea', '东亚银行', 'hk-bank', ['东亚银行', '東亞銀行', '东亚', '東亞', 'bea']),
  brand('citi', '花旗银行', 'hk-bank', ['花旗', '花旗银行', 'citi', 'citibank']),
  brand('dahsing', '大新银行', 'hk-bank', ['大新银行', '大新']),
  brand('empf', '强积金', 'hk-bank', ['强积金', '強積金', '积金易', '積金易', 'empf', 'mpf', 'mpfa']),

  // —— 券商 ——
  brand('futu', '富途牛牛', 'broker', ['富途牛牛', '富途', '牛牛', 'futu', 'futubull']),
  brand('tiger', '老虎证券', 'broker', ['老虎证券', '老虎證券', '老虎', 'tiger trade', 'tiger']),
  brand('moomoo', 'moomoo', 'broker', ['moomoo']),
  brand('guosen', '国信金太阳', 'broker', ['国信金太阳', '国信证券', '国信', '金太阳', 'guosen']),
  brand('citics', '中信证券', 'broker', ['中信证券', '中信建投', 'citics']),
  brand('htsc', '华泰证券', 'broker', ['华泰证券', '华泰', '涨乐财富通', '涨乐']),
  brand('gtja', '国泰君安', 'broker', ['国泰君安', '国泰海通', '国泰', '君安']),
  brand('chinastock', '银河证券', 'broker', ['银河证券', '中国银河', '银河']),
  brand('eastmoney', '东方财富', 'broker', ['东方财富', '东财', '天天基金']),
  brand('ths', '同花顺', 'broker', ['同花顺', '同花']),

  // —— 虚拟货币平台 ——
  brand('binance', '币安', 'crypto', ['币安', 'binance', 'bnb']),
  brand('okx', '欧易', 'crypto', ['欧易', 'okx', 'okex']),
  brand('htx', '火币', 'crypto', ['火币', 'htx', 'huobi', 'HTX']),
  brand('gateio', '芝麻开门', 'crypto', ['芝麻开门', 'gate.io', 'gateio', 'gate']),
  brand('bybit', 'Bybit', 'crypto', ['bybit']),

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

  // —— 固定资产（房产细分在前：名字里带「高层 / 公寓 / 别墅…」的先被更长关键词命中）——
  illus('house-highrise', '高层住宅', 'physical', ['高层住宅', '高层', '塔楼', '大厦', '房子', '房产', '房屋', '住宅', 'house']),
  illus('house-apartment', '公寓', 'physical', ['公寓', '服务式公寓', 'apartment']),
  illus('house-villa', '别墅', 'physical', ['别墅', '独栋']),
  illus('house-stacked', '叠墅', 'physical', ['叠墅', '叠拼', '上叠', '下叠']),
  illus('house-selfbuilt', '自建房', 'physical', ['自建房', '宅基地', '自建']),
  illus('car', '车子', 'physical', ['车子', '汽车', '轿车', '代步车', 'car']),
  illus('parking', '车位', 'physical', ['车位', '停车位']),
  illus('tv', '电视', 'physical', ['电视', '电视机']),
  illus('fridge', '冰箱', 'physical', ['冰箱']),
  illus('sofa', '沙发', 'physical', ['沙发']),
  illus('robotvac', '扫地机器人', 'physical', ['扫地', '扫地机器人', '扫地机']),
  illus('laptop', '电脑', 'physical', ['电脑', '笔记本', 'macbook', 'laptop']),
  illus('phone', '手机', 'physical', ['手机', 'iphone', 'phone']),
  illus('tablet', '平板', 'physical', ['平板', 'ipad', 'tablet']),
  illus('camera', '相机', 'physical', ['相机', '单反', '微单']),
  illus('lens', '镜头', 'physical', ['镜头']),
  illus('drone', '无人机', 'physical', ['无人机', 'drone']),
  illus('console', '游戏主机', 'physical', ['游戏机', '游戏主机', 'switch', 'ps5', 'xbox']),
  illus('pencil', '手写笔', 'physical', ['手写笔', 'pencil', 'apple pencil']),
  illus('earbuds', '无线耳机', 'physical', ['耳机', 'airpods', 'buds']),
  illus('watch', '智能手表', 'physical', ['手表', '智能手表', 'iwatch', 'watch']),
  illus('keyboard', '机械键盘', 'physical', ['键盘', '机械键盘']),
  illus('ereader', '电纸书', 'physical', ['电纸书', '电纸', 'kindle']),
  illus('speaker', '音箱', 'physical', ['音箱', '音响']),
  illus('projector', '投影仪', 'physical', ['投影', '投影仪']),
  illus('vr', 'VR 头显', 'physical', ['vr', '头显', 'vision pro']),
  illus('ebike', '摩托/电驴', 'physical', ['摩托', '电驴', '电动车', '电瓶车']),
  illus('bicycle', '自行车', 'physical', ['自行车', '公路车', '山地车']),
  illus('bag', '名牌包', 'physical', ['名牌包', '手袋', '皮包', 'lv', 'hermes', '香奈儿']),
  illus('jewelry', '珠宝首饰', 'physical', ['珠宝', '首饰', '戒指', '项链', '钻石']),
  illus('gold', '金条', 'physical', ['金条', '黄金', '金饰', 'gold']),

  // —— 乐器 ——
  illus('guitar', '吉他', 'instrument', ['吉他', 'guitar', '贝斯', 'bass']),
  illus('piano', '钢琴', 'instrument', ['钢琴', 'piano']),
  illus('keys', '电子琴', 'instrument', ['电子琴', '电钢', '合成器', 'midi']),
  illus('drum', '鼓', 'instrument', ['鼓', '架子鼓', 'drum']),
  illus('mic', '麦克风', 'instrument', ['麦克风', '话筒', 'mic']),
  illus('music', '乐器', 'instrument', ['乐器', '小提琴', '大提琴', '萨克斯', '长笛', '二胡']),
];

export const ICON_BY_ID: Record<string, IconEntry> = Object.fromEntries(ICONS.map((i) => [i.id, i]));

export const ICON_GROUP_META: { id: IconGroup; cn: string; latin: string }[] = [
  { id: 'ewallet', cn: '电子钱包', latin: 'E-WALLETS' },
  { id: 'cn-bank', cn: '中国银行', latin: 'CN BANKS' },
  { id: 'hk-bank', cn: '香港银行', latin: 'HK BANKS' },
  { id: 'broker', cn: '券商', latin: 'BROKERS' },
  { id: 'crypto', cn: '虚拟货币', latin: 'CRYPTO' },
  { id: 'cash', cn: '现金', latin: 'CASH' },
  { id: 'physical', cn: '固定资产', latin: 'FIXED' },
  { id: 'instrument', cn: '乐器', latin: 'INSTRUMENTS' },
];

/** 自定义上传图标的 iconKey 前缀，后面拼文件 URI */
export const CUSTOM_ICON_PREFIX = 'custom:';

export function customIconKey(uri: string): string {
  return CUSTOM_ICON_PREFIX + uri;
}

export function parseCustomIconKey(key: string): string | null {
  return key.startsWith(CUSTOM_ICON_PREFIX) ? key.slice(CUSTOM_ICON_PREFIX.length) : null;
}

/** 自定义图标条目（文件 URI 即图标，不进 ICONS 目录） */
export function customIconEntry(uri: string): IconEntry {
  return {
    id: customIconKey(uri),
    label: '自定义图标',
    kind: 'brand',
    group: 'physical',
    keywords: [],
    source: { uri },
  };
}

const TYPE_FALLBACK: Record<string, string> = {
  ewallet: 'wechat',
  credit: 'cmb',
  debit: 'icbc',
  investment: 'futu',
  cash: 'cash-CNY',
  stored: 'octopus',
  receivable: 'gold',
  payable: 'gold',
  physical: 'house-highrise',
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
  if (input.iconKey) {
    const uri = parseCustomIconKey(input.iconKey);
    if (uri) return customIconEntry(uri);
  }

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
  const fb = TYPE_FALLBACK[input.type] ?? 'house-highrise';
  return ICON_BY_ID[fb] ?? ICONS[0];
}
