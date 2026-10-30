import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { motion, radius, spacing, type Palette } from '../theme';
import { useThemedStyles } from '../state/ThemeContext';
import { motionOff } from './Motion';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** 面板本身的样式（背景、圆角、内边距） */
  style?: StyleProp<ViewStyle>;
}

/** 纱幕淡入淡出比面板升起更快（与网页端 0.2s / 0.28s 一致）*/
const SCRIM_MS = 200;
/** 面板没量到高度前的兜底位移 */
const FALLBACK_TRAVEL = 720;

/**
 * 自绘底部弹层：纱幕 0.2s 淡入，面板 0.28s 升上来，开关对称。
 * 不用 Modal 的 slide —— 那套动画关不掉、也做不成对称；
 * 只点纱幕或 ×，没有下滑关闭（避免跟键盘手势打架）。
 */
export function Sheet({ visible, onClose, children, style }: Props) {
  const styles = useThemedStyles(createStyles);
  const [mounted, setMounted] = useState(visible);
  const [panelH, setPanelH] = useState(0);
  const prog = useRef(new Animated.Value(0)).current;
  const scrim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const run = (v: Animated.Value, to: number, ms: number) =>
      Animated.timing(v, {
        toValue: to,
        duration: motionOff() ? 0 : ms,
        easing: motion.easing,
        useNativeDriver: true,
      });

    if (visible) {
      setMounted(true);
      const a1 = run(prog, 1, motion.slow);
      const a2 = run(scrim, 1, SCRIM_MS);
      a1.start();
      a2.start();
      return () => {
        a1.stop();
        a2.stop();
      };
    }

    const a1 = run(prog, 0, motion.slow);
    const a2 = run(scrim, 0, SCRIM_MS);
    a1.start(({ finished }) => {
      if (finished) setMounted(false);
    });
    a2.start();
    return () => {
      a1.stop();
      a2.stop();
    };
  }, [visible, prog, scrim]);

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.scrim, { opacity: scrim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="关闭" />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kav}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.panel,
              style,
              {
                transform: [
                  {
                    translateY: prog.interpolate({
                      inputRange: [0, 1],
                      outputRange: [panelH || FALLBACK_TRAVEL, 0],
                    }),
                  },
                ],
              },
            ]}
            onLayout={(e) => setPanelH(e.nativeEvent.layout.height)}
          >
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrim,
  },
  kav: {
    maxHeight: '92%',
  },
  panel: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: radius.seal * 3,
    borderTopRightRadius: radius.seal * 3,
    paddingTop: spacing(3),
  },
});
