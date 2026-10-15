import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors, motion } from '../theme';
import { motionOff } from './Motion';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  values: number[];
  width: number;
  height: number;
  color?: string;
  /** 换一个值就重播一次描线（区间切换用） */
  replayKey?: string | number;
}

/**
 * 净值折线：一条等宽印字线从左描到右，末位点一下落。
 * 几何在 JS 里算一次；动画只驱动 strokeDashoffset / 末点透明度，
 * 整图只有 2 个原生节点，不按天数建视图。
 */
export const SparkLine = memo(function SparkLine({
  values,
  width,
  height,
  color = colors.ink,
  replayKey,
}: Props) {
  const geom = useMemo(() => build(values, width, height), [values, width, height]);
  if (!geom) return null;

  return (
    <Svg width={width} height={height}>
      <DrawPath d={geom.d} length={geom.length} color={color} replayKey={replayKey} />
      <DrawDot cx={geom.end.x} cy={geom.end.y} color={color} replayKey={replayKey} />
    </Svg>
  );
});

function DrawPath({
  d,
  length,
  color,
  replayKey,
}: {
  d: string;
  length: number;
  color: string;
  replayKey?: string | number;
}) {
  const skip = motionOff();
  const v = useRef(new Animated.Value(skip ? 1 : 0)).current;
  const first = useRef(true);
  // 贝塞尔略长于折线；多留 35%，描线不会提前收住，多出来的那段 offset 已经看不见。
  const dash = length * 1.35;

  useEffect(() => {
    if (skip) {
      v.setValue(1);
      return;
    }
    const delay = first.current ? 40 : 0;
    first.current = false;
    v.setValue(0);
    const anim = Animated.timing(v, {
      toValue: 1,
      duration: 520,
      delay,
      easing: motion.easing,
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [d, length, replayKey, skip, v]);

  const offset = v.interpolate({ inputRange: [0, 1], outputRange: [dash, 0] });

  return (
    <AnimatedPath
      d={d}
      stroke={color}
      strokeWidth={1.6}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={[dash, dash]}
      strokeDashoffset={offset}
    />
  );
}

function DrawDot({
  cx,
  cy,
  color,
  replayKey,
}: {
  cx: number;
  cy: number;
  color: string;
  replayKey?: string | number;
}) {
  const skip = motionOff();
  const v = useRef(new Animated.Value(skip ? 1 : 0)).current;

  useEffect(() => {
    if (skip) {
      v.setValue(1);
      return;
    }
    v.setValue(0);
    const anim = Animated.timing(v, {
      toValue: 1,
      duration: 180,
      delay: 480,
      easing: motion.easing,
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [cx, cy, replayKey, skip, v]);

  return <AnimatedCircle cx={cx} cy={cy} r={2.6} fill={color} opacity={v} />;
}

function build(values: number[], width: number, height: number) {
  if (values.length < 2 || width <= 0 || height <= 0) return null;
  const padY = 6;
  const padX = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  // 几乎持平也给一点起伏，避免一条死直线贴在正中
  const lo = span < 1e-6 ? min - 1 : min;
  const hi = span < 1e-6 ? max + 1 : max;
  const innerH = height - padY * 2;
  const innerW = width - padX * 2;
  const n = values.length;
  const pts = values.map((v, i) => {
    const x = padX + (i / (n - 1)) * innerW;
    const y = padY + (1 - (v - lo) / (hi - lo)) * innerH;
    return { x, y };
  });
  return { d: catmull(pts), length: polylineLength(pts), end: pts[pts.length - 1] };
}

/** 过点的平滑折线：Catmull-Rom → 三次贝塞尔，张力 0.5。点数少时退回折线。 */
function catmull(pts: { x: number; y: number }[]): string {
  if (pts.length === 2) {
    return `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)} L${pts[1].x.toFixed(1)},${pts[1].y.toFixed(1)}`;
  }
  // 张力 1 = 标准 Catmull-Rom，控制点 = 邻点差 / 6
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

function polylineLength(pts: { x: number; y: number }[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i += 1) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    len += Math.hypot(dx, dy);
  }
  return Math.max(len, 1);
}
