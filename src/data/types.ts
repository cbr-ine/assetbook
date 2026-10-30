/**
 * 数据模型。与 SQLite 表结构一一对应（见 src/data/schema.ts 的注释）。
 * 核心简化：账户、投资持仓、实物、应收应付都是同一种「资产项」，用 group + type 区分。
 */

/** 两大分组：可流动现金等值物 / 固定资产与实物 */
export type AssetGroup = 'liquid' | 'fixed';

/**
 * 资产项细分类型。流动部分按「钱的存放形态」细分：
 *  - ewallet      网络支付（支付宝 / 微信零钱）
 *  - credit       信用卡 / 花呗 / 白条（欠款，存负数）
 *  - debit        储蓄卡（借记卡 / 活期）
 *  - investment   投资账户（只记现值）
 *  - cash         现金
 *  - stored       储值卡（公交卡 / 礼品卡等预充值）
 *  - receivable   应收账户（借出款，正数）
 *  - payable      应付账户（欠款，存负数）
 *  - physical     固定资产 / 实物
 */
export type AssetType =
  | 'ewallet'
  | 'credit'
  | 'debit'
  | 'investment'
  | 'cash'
  | 'stored'
  | 'receivable'
  | 'payable'
  | 'physical';

/** 类型决定分组，编辑器里不再单独挑分组。 */
export const TYPE_GROUP: Record<AssetType, AssetGroup> = {
  ewallet: 'liquid',
  credit: 'liquid',
  debit: 'liquid',
  investment: 'liquid',
  cash: 'liquid',
  stored: 'liquid',
  receivable: 'liquid',
  payable: 'liquid',
  physical: 'fixed',
};

/** 存负数的欠款类（数字键盘没有减号，由保存时统一加符号）。 */
export const NEGATIVE_TYPES: readonly AssetType[] = ['credit', 'payable'];

export interface AssetItem {
  id: string;
  name: string;
  /** 当前金额，允许为负（应付为负）。以 currency 计价。 */
  value: number;
  currency: string;
  group: AssetGroup;
  type: AssetType;
  /** 实物可选照片（本地 file:// URI） */
  photoUri?: string;
  /** 手选的类目图标 id；空着则按名称关键词自动匹配 */
  iconKey?: string;
  note?: string;
  sort?: number;
  /** 房产：建筑面积（㎡） */
  areaM2?: number;
  /** 房产：区域（城市 / 板块，自由文本） */
  region?: string;
}

/** 一笔支出。只记支出，收入暂不做。 */
export interface Expense {
  id: string;
  /** 正数，计价币种由 account 决定，这里冗余存一份便于多币种统计 */
  amount: number;
  currency: string;
  note: string;
  /** 从哪个资产项支出，记账时自动扣减其余额 */
  accountId: string;
  /** ISO 日期字符串 */
  date: string;
}

/** 手动维护的汇率表，统一折算到人民币 */
export interface Rate {
  currency: string;
  /** 1 单位该币种 = 多少人民币 */
  toCny: number;
}

/** 一天的净值快照（id 与 date 都是 YYYY-MM-DD） */
export interface Snapshot {
  id: string;
  date: string;
  /** 当日净资产（人民币计） */
  totalCny: number;
}

/** 汇总后的净资产视图模型 */
export interface NetWorthSummary {
  /** 折算成人民币的净资产总额 */
  net: number;
  /** 可流动现金等值物合计（含应收正 / 应付负） */
  liquid: number;
  /** 固定资产与实物合计 */
  fixed: number;
  baseCurrency: string;
}
