import { Easing, StyleSheet, type TextStyle } from 'react-native';

/**
 * 全局设计变量 · 方向「凭条 · 票据质感」
 * 视觉母题：一张刚从热敏打印机里出来的对账单 —— 等宽印字、虚线分段、打孔边。
 * 整屏是一张纸，不是一堆卡片。
 */

export const colors = {
  paper: '#EDEAE2', // 热敏凭条纸（冷白，不是米黄）
  paperHi: '#F4F2EC', // 略亮的纸：用于让悬浮键的纸圈盖住虚线
  ink: '#1C2530', // 印字蓝黑
  dimInk: '#5E6675', // 次级印字：对纸底约 4.8:1，正文/标签/说明都用它
  dim: '#6C7480', // 淡印字：仅限纯装饰（凭条编号、底部结算语），不承载语义
  stamp: '#B3241C', // 验讫章红：删除 / 危险动作 / 超支
  ok: '#3E6B4F', // 验讫绿：预算内（≤80%）
  warn: '#A8742A', // 警示赭：预算过八成
  dash: 'rgba(28,37,48,0.40)', // 分段虚线
  dashSoft: 'rgba(28,37,48,0.22)', // 点线引导
  scrim: 'rgba(28,37,48,0.35)', // 弹层遮罩：压在纸上的印字色薄纱
  press: 'rgba(28,37,48,0.06)', // 按压底衬
  onInk: '#EDEAE2',
} as const;

/**
 * 字体分工：数字与拉丁文一律等宽（打印感），中文用无衬线黑体（热敏机的汉字字模）。
 * 字体在 App.tsx 里加载，未就绪不渲染，避免闪回。
 */
export const fontFamily = {
  mono: 'IBMPlexMono_400Regular',
  monoMed: 'IBMPlexMono_500Medium',
  monoSemi: 'IBMPlexMono_600SemiBold',
  sans: 'NotoSansSC_400Regular',
  sansMed: 'NotoSansSC_500Medium',
  sansBold: 'NotoSansSC_700Bold',
} as const;

export const radius = { seal: 4, ring: 999 } as const;

export const spacing = (n: number) => n * 4;

export const type = {
  total: 40,
  h2: 17,
  body: 14.5,
  small: 12,
  label: 10.5,
  tiny: 9,
} as const;

/** 等宽数位 + 表格数字，让金额在浮点下也对齐 */
export const numerals: TextStyle = { fontVariant: ['tabular-nums'] };

/**
 * 动效令牌 · 克制 · 纸感
 * 全部过渡 120–200ms，统一 ease-out（cubic-bezier(.2,.8,.2,1)）；无弹簧、无错峰。
 * 与网页预览端 preview/app.css 的 --t-* / --ease 一一对应，改这里就两边一起改。
 */
export const motion = {
  fast: 120, // 按压反馈
  base: 160, // 入场 / 数字滚动
  slow: 280, // 弹层升降
  press: 0.97, // 按压缩放
  easing: Easing.bezier(0.2, 0.8, 0.2, 1),
  /** 数字滚动一格（每位数码的高度即行高）*/
  roll: 180,
  /** 柱体从基线长上来 */
  bar: 200,
} as const;

/** 最小可点区域（iOS HIG 44pt）；装饰性小图标的 hitSlop 用它补齐 */
export const touchTarget = 44;

export const hair = StyleSheet.hairlineWidth;
