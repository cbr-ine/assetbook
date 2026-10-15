import type { AssetGroup, AssetType } from '../data/types';

/**
 * 资产分组 / 类型的展示文案。中文用于行内标签，拉丁文用于凭条式的等宽小字。
 * 集中放这里，资产页与资产编辑弹层共用，避免两处各写一份。
 */

export const ASSET_GROUP_LABEL: Record<AssetGroup, string> = {
  liquid: '可流动现金等值物',
  fixed: '固定资产与实物',
};

export const ASSET_GROUP_LATIN: Record<AssetGroup, string> = {
  liquid: 'LIQUID',
  fixed: 'FIXED',
};

export const ASSET_TYPE_LABEL: Record<AssetType, string> = {
  ewallet: '网络支付',
  credit: '信用卡/花呗/白条',
  debit: '储蓄卡',
  investment: '投资账户',
  cash: '现金',
  stored: '储值卡',
  receivable: '应收账户',
  payable: '应付账户',
  physical: '固定资产/实物',
};

export const ASSET_TYPE_LATIN: Record<AssetType, string> = {
  ewallet: 'WALLET',
  credit: 'CREDIT',
  debit: 'DEBIT',
  investment: 'INVEST',
  cash: 'CASH',
  stored: 'STORED',
  receivable: 'RECV',
  payable: 'PAYB',
  physical: 'PHYS',
};

/** 类型选择器的固定顺序：按钱的常用程度排，实物殿后（属于固定组）。 */
export const ASSET_TYPES: AssetType[] = [
  'ewallet',
  'credit',
  'debit',
  'investment',
  'cash',
  'stored',
  'receivable',
  'payable',
  'physical',
];

/** 分组选择器的固定顺序 */
export const ASSET_GROUPS: AssetGroup[] = ['liquid', 'fixed'];
