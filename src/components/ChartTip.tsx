import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '../state/ThemeContext';
import { fontFamily, radius, spacing, type as t, type Palette } from '../theme';

/**
 * 图表点选气泡：日期 + 金额两行的小票。
 * 位置自适应：水平方向对准锚点 x、夹在图内不越界（先量宽再落位）；
 * 垂直方向优先浮在锚点上方，上方放不下就翻到下方。
 * pointerEvents 关掉 —— 气泡只读，不挡下一次点选。
 */
export function ChartTip({
  anchorX,
  anchorTop,
  chartW,
  chartH,
  label,
  value,
}: {
  /** 锚点（柱顶 / 折线点）在图内的 x 与 y */
  anchorX: number;
  anchorTop: number;
  chartW: number;
  chartH: number;
  label: string;
  value: string;
}) {
  const styles = useThemedStyles(createStyles);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const GAP = 8;

  const left = Math.min(Math.max(anchorX - size.w / 2, 2), Math.max(chartW - size.w - 2, 2));
  const top =
    anchorTop - size.h - GAP >= 0
      ? anchorTop - size.h - GAP
      : Math.min(anchorTop + GAP, Math.max(chartH - size.h, 0));

  return (
    <View
      style={[styles.tip, { left, top }]}
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        setSize({ w, h });
      }}
      pointerEvents="none"
    >
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    tip: {
      position: 'absolute',
      backgroundColor: colors.paperHi,
      borderWidth: 1,
      borderColor: colors.dash,
      borderRadius: radius.seal,
      paddingHorizontal: spacing(2.5),
      paddingVertical: spacing(1.5),
      alignItems: 'center',
      maxWidth: 160,
    },
    label: {
      fontFamily: fontFamily.mono,
      fontSize: t.tiny,
      letterSpacing: 0.5,
      color: colors.dimInk,
    },
    value: {
      fontFamily: fontFamily.monoMed,
      fontSize: t.small,
      letterSpacing: 0.5,
      color: colors.ink,
      marginTop: spacing(0.5),
    },
  });
