import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { fontFamily, motion, radius, spacing, type as t, type Palette } from '../theme';
import { useThemedStyles } from '../state/ThemeContext';

/**
 * 底部吐司：统一承载「已更新 / 联网失败」这类一次性提示。
 * 从底部浮起 8px + 淡入（160ms），2.6s 后自己退回；点不到、不挡操作。
 * 需要用户确认的破坏性动作走 Confirm（同目录）。
 */

const Ctx = React.createContext<{ show: (message: string) => void }>({ show: () => {} });

export function useToast() {
  return React.useContext(Ctx);
}

const HOLD_MS = 2600;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(createStyles);
  const [message, setMessage] = useState<string | null>(null);
  const v = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (next: string) => {
      setMessage(next);
      if (timer.current) clearTimeout(timer.current);
      Animated.timing(v, {
        toValue: 1,
        duration: motion.base,
        easing: motion.easing,
        useNativeDriver: true,
      }).start();
      timer.current = setTimeout(() => {
        Animated.timing(v, {
          toValue: 0,
          duration: motion.fast,
          easing: motion.easing,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) setMessage(null);
        });
      }, HOLD_MS);
    },
    [v],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <Ctx.Provider value={value}>
      <View style={styles.host}>
        {children}
        {message ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.toast,
              {
                opacity: v,
                transform: [
                  { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
                ],
              },
            ]}
          >
            <Text style={styles.text} numberOfLines={3}>
              {message}
            </Text>
          </Animated.View>
        ) : null}
      </View>
    </Ctx.Provider>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
  host: {
    flex: 1,
  },
  toast: {
    position: 'absolute',
    left: spacing(6),
    right: spacing(6),
    bottom: spacing(24),
    backgroundColor: colors.paperHi,
    borderWidth: 1,
    borderColor: colors.dash,
    borderRadius: radius.seal,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
  },
  text: {
    fontFamily: fontFamily.mono,
    fontSize: t.small,
    letterSpacing: 0.5,
    color: colors.ink,
    textAlign: 'center',
  },
});
