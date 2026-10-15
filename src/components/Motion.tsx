import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, motion } from '../theme';

/**
 * 动效基础件 · 克制 · 纸感
 * 时长与缓动一律来自 theme.motion；不动用任何第三方动画库。
 * 系统开了「减少动态效果」时，这里所有动画降为瞬时（与网页端 @media 对齐）。
 */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

let reduced = false;
AccessibilityInfo.isReduceMotionEnabled().then((v) => {
  reduced = v;
});
AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
  reduced = v;
});

/** 是否应该跳过动画（读的是模块级快照，够用且不用把 prop 一路传下去） */
export function motionOff(): boolean {
  return reduced;
}

/**
 * 页面入场：上浮 8px + 淡入，160ms。
 * 屏幕是切 Tab 时挂载 / 卸载的，所以这个动画天然只在切页时播一次。
 */
export function EnterView({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const v = useRef(new Animated.Value(motionOff() ? 1 : 0)).current;

  useEffect(() => {
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
  }, [v]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v,
          transform: [
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

interface PressableScaleProps extends PressableProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** 按下时垫一层浅印（键位 / 列表行用它），120ms 内随缩放一起收 */
  pressTint?: boolean;
  /** 按下时的不透明度（深底键位用，浅印在深底上看不出来）*/
  pressOpacity?: number;
}

/** 按压反馈：缩到 0.97（120ms），统一 ease-out；可选一层浅底衬或不透明度。 */
export function PressableScale({
  children,
  style,
  pressTint = false,
  pressOpacity,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const v = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);

  const scaleTo = (to: number) => {
    if (motionOff()) {
      v.setValue(to);
      return;
    }
    Animated.timing(v, {
      toValue: to,
      duration: motion.fast,
      easing: motion.easing,
      useNativeDriver: true,
    }).start();
  };

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        setPressed(true);
        scaleTo(motion.press);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        scaleTo(1);
        onPressOut?.(e);
      }}
      style={[
        style,
        pressTint && pressed ? { backgroundColor: colors.press } : null,
        pressed && pressOpacity != null ? { opacity: pressOpacity } : null,
        { transform: [{ scale: v }] },
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}
