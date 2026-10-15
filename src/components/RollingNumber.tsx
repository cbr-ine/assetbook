import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';

import { motion } from '../theme';

/**
 * 数字滚动：每位数字各自一格，垂直滚到新值（180ms，统一 ease-out）。
 *
 * 只有「变了」的位数才滚 —— 逐位与上一次的文本做同位置比对（前缀对齐），
 * 新增的位数从 0 滚入，所以输入 `12` → `123` 只有第三位在动。
 * 首次渲染直接落位，不滚动。
 *
 * 静止态永远是正确值：动画只是叠加层，被打断 / 被系统省电节流也不会停在中途。
 */

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

interface Props {
  /** 目标文本；非数字字符（千分位、负号、货币符号）原样静态显示 */
  text: string;
  style?: StyleProp<TextStyle>;
  /** 单格高度，须与 style.lineHeight 一致 */
  cellHeight: number;
}

export function RollingNumber({ text, style, cellHeight }: Props) {
  // 上一次提交的文本；在 effect 里更新，所以渲染期读到的是"上一帧的值"。
  const prevRef = useRef<string | null>(null);
  const prev = prevRef.current;

  useEffect(() => {
    prevRef.current = text;
  }, [text]);

  const prevDigits: number[] = [];
  if (prev != null) {
    for (let i = 0; i < prev.length; i++) {
      const c = prev[i];
      if (c >= '0' && c <= '9') prevDigits.push(Number(c));
    }
  }

  const cells: React.ReactNode[] = [];
  let slot = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch < '0' || ch > '9') {
      cells.push(
        <Text key={`s${i}`} style={[style, { height: cellHeight, lineHeight: cellHeight }]}>
          {ch}
        </Text>,
      );
      continue;
    }
    const to = Number(ch);
    const from = prev == null ? null : slot < prevDigits.length ? prevDigits[slot] : 0;
    cells.push(<RollCol key={`d${i}`} from={from} to={to} cellHeight={cellHeight} style={style} />);
    slot += 1;
  }

  return (
    <View
      style={styles.root}
      accessible
      accessibilityRole="text"
      accessibilityLabel={text}
      importantForAccessibility="yes"
    >
      {cells}
    </View>
  );
}

function RollCol({
  from,
  to,
  cellHeight,
  style,
}: {
  from: number | null;
  to: number;
  cellHeight: number;
  style?: StyleProp<TextStyle>;
}) {
  const v = useRef(new Animated.Value(-(from ?? to))).current;
  // 上一轮滚动是否已经播完：没播完又来新值（连续敲键）就不再重滚，
  // 直接落位 —— 否则 stop→setValue→start 三步都要过 JS 桥，打得快时
  // 数位会停在半路（"卡在跳动的时候"）。
  const settled = useRef(true);

  // 绘制前（layout effect）就落值 / 起动画：普通 effect 晚一帧，JS 忙时
  // 新数位会先以初值 0 上屏一瞬，看着就是"卡在半路"。
  useLayoutEffect(() => {
    if (from == null || from === to) {
      v.setValue(-to);
      settled.current = true;
      return;
    }
    if (!settled.current) {
      v.stopAnimation();
      v.setValue(-to);
      return;
    }
    settled.current = false;
    v.setValue(-from);
    const anim = Animated.timing(v, {
      toValue: -to,
      duration: motion.roll,
      easing: motion.easing,
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished) settled.current = true;
    });
    return () => anim.stop();
  }, [from, to, v]);

  const translateY = v.interpolate({
    inputRange: [-9, 0],
    outputRange: [-9 * cellHeight, 0],
  });

  return (
    <View style={[styles.col, { height: cellHeight }]}>
      <Animated.View style={{ transform: [{ translateY }] }}>
        {DIGITS.map((d) => (
          <Text key={d} style={[style, { height: cellHeight, lineHeight: cellHeight }]}>
            {d}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  col: {
    overflow: 'hidden',
  },
});
