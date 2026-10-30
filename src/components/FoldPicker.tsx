import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';

import { fontFamily, motion, spacing, type as t, type Palette } from '../theme';
import { useTheme, useThemedStyles } from '../state/ThemeContext';
import { motionOff, PressableScale } from './Motion';
import { DotLeader } from './Rule';

/**
 * 折叠选择器：收起时是一行「标签 …… 当前值 ⌄」，点开弹出胶囊云。
 * 给选项会一直变多的场合（支出账户、添加币种）收拢版面：
 * 平时只占一行，展开时 160ms 上浮淡入（与页面入场同一动效语言），
 * 选中后由外层把 expanded 收回 false。
 */
export function FoldPicker({
  label,
  value,
  dim,
  expanded,
  onToggle,
  children,
}: {
  label: string;
  /** 收起行右侧显示的当前值 / 概要 */
  value: string;
  /** 无可选项时的弱化样式 */
  dim?: boolean;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!expanded) return;
    if (motionOff()) {
      v.setValue(1);
      return;
    }
    const anim = Animated.timing(v, {
      toValue: 1,
      duration: motion.base,
      easing: motion.easing,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [expanded, v]);

  return (
    <View>
      <PressableScale
        onPress={onToggle}
        pressTint
        style={styles.head}
        accessibilityLabel={`${label}，${expanded ? '收起' : '展开'}`}
      >
        <Text style={styles.label}>{label}</Text>
        <DotLeader />
        <Text style={[styles.value, dim && styles.valueDim]} numberOfLines={1}>
          {value}
        </Text>
        {expanded ? (
          <ChevronUp size={14} color={colors.dimInk} strokeWidth={1.8} />
        ) : (
          <ChevronDown size={14} color={colors.dimInk} strokeWidth={1.8} />
        )}
      </PressableScale>
      {expanded ? (
        <Animated.View
          style={{
            opacity: v,
            transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
          }}
        >
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    minHeight: 44,
    borderRadius: 6,
  },
  label: {
    fontFamily: fontFamily.mono,
    fontSize: t.label,
    letterSpacing: 1.5,
    color: colors.dimInk,
  },
  value: {
    fontFamily: fontFamily.sansMed,
    fontSize: t.small,
    color: colors.ink,
    maxWidth: '46%',
  },
  valueDim: {
    color: colors.dimInk,
  },
});
