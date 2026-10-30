import React, { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { motion } from '../theme';
import { useTheme } from '../state/ThemeContext';
import { ChartTip } from './ChartTip';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface Props {
  values: number[];
  width: number;
  height: number;
  color?: string;
  /** 峰值单根换色，用来指认「这个月最高的一天」 */
  highlightColor?: string;
  /** 换一个值就重播一次生长（本月 / 本周 切换用） */
  replayKey?: string | number;
  /** 关掉动画（例如系统开启「减少动态效果」时由调用方传入） */
  animate?: boolean;
  /** 给了就开点选：按某根柱弹出「日期 + 金额」气泡（自适应位置） */
  tooltip?: (index: number) => { label: string; value: string } | null;
}

/**
 * 支出柱：热敏打印机打出来的竖条，不是折线也不是渐变面积。
 * 零支出的那天留一根极短的弱条，保持日历式节奏。
 * 进场时全部柱体同时从基线（y = 底）长到目标高度，200ms 统一 ease-out。
 * 点选：每根柱占一整列透明命中区（矮柱 / 零柱也点得到），再点一次取消。
 */
export function Bars({
  values,
  width,
  height,
  color,
  highlightColor,
  replayKey,
  animate = true,
  tooltip,
}: Props) {
  const { colors } = useTheme();
  const base = color ?? colors.ink;
  const [sel, setSel] = useState<number | null>(null);

  // 换区间 / 换数据，旧选中即失效
  useEffect(() => {
    setSel(null);
  }, [replayKey, values]);

  if (!values.length) return null;

  const max = Math.max(...values, 1);
  const peak = Math.max(...values);
  const pad = 4;
  const step = width / values.length;
  const bw = step * 0.62;

  const tip = sel != null && tooltip ? tooltip(sel) : null;
  const selTop =
    sel != null
      ? height - (values[sel] > 0 ? Math.max((values[sel] / max) * (height - pad), 1.5) : 1)
      : 0;
  const selX = sel != null ? sel * step + step / 2 : 0;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {values.map((v, i) => {
          const h = v > 0 ? Math.max((v / max) * (height - pad), 1.5) : 1;
          const fill = v > 0 && v === peak && highlightColor ? highlightColor : base;
          return (
            <GrowBar
              key={i}
              x={i * step + (step - bw) / 2}
              baseY={height}
              bw={bw}
              targetH={h}
              fill={fill}
              opacity={v > 0 ? 0.85 : 0.28}
              replayKey={replayKey}
              animate={animate}
            />
          );
        })}
        {tooltip
          ? values.map((_, i) => (
              <Rect
                key={`t${i}`}
                x={i * step}
                y={0}
                width={step}
                height={height}
                fill="transparent"
                onPress={() => setSel(sel === i ? null : i)}
              />
            ))
          : null}
      </Svg>
      {tip ? (
        <ChartTip
          anchorX={selX}
          anchorTop={selTop}
          chartW={width}
          chartH={height}
          label={tip.label}
          value={tip.value}
        />
      ) : null}
    </View>
  );
}

function GrowBar({
  x,
  baseY,
  bw,
  targetH,
  fill,
  opacity,
  replayKey,
  animate,
}: {
  x: number;
  baseY: number;
  bw: number;
  targetH: number;
  fill: string;
  opacity: number;
  replayKey?: string | number;
  animate: boolean;
}) {
  const v = useRef(new Animated.Value(1)).current;
  // 挂载那一帧直接画全高：生长动画只在值 / replayKey 变化时播（区间切换）。
  // 否则页面挂载瞬间几十根柱各起一个 JS 计时器，正好撞上整页布局，切 tab 就卡。
  const first = useRef(true);

  useEffect(() => {
    if (!animate || first.current) {
      first.current = false;
      v.setValue(1);
      return;
    }
    v.setValue(0);
    const anim = Animated.timing(v, {
      toValue: 1,
      duration: motion.bar,
      easing: motion.easing,
      useNativeDriver: false, // 高度/位置是布局属性，只能走 JS 驱动
    });
    anim.start();
    return () => anim.stop();
  }, [targetH, replayKey, animate, v]);

  const h = v.interpolate({ inputRange: [0, 1], outputRange: [0, targetH] });
  const y = v.interpolate({ inputRange: [0, 1], outputRange: [baseY, baseY - targetH] });

  return <AnimatedRect x={x} y={y} width={bw} height={h} fill={fill} opacity={opacity} />;
}
