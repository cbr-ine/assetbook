import { Platform } from 'react-native';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as NavigationBar from 'expo-navigation-bar';

import { dark, light, type Palette } from '../theme';
import * as repo from '../data/repo';

/**
 * 外观（light / dark）的状态与分发。
 * 偏好落在 SQLite meta 表（与基准币种同库同表）；开机在 App.tsx 里与字体
 * 一起等它读回来再出纸，夜间用户不会先闪一张白凭条。
 * 组件侧一律通过 useTheme() 拿当前色板，或用 useThemedStyles() 把模块级
 * 样式工厂挂到色板上 —— 换肤时整树样式随 context 一次重建，平时零开销。
 */

export type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  /** 当前生效的色板；沿袭组件里写惯的 colors.* 命名 */
  colors: Palette;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  initialMode,
  children,
}: {
  initialMode: ThemeMode;
  children: React.ReactNode;
}) {
  const [mode, setModeState] = useState<ThemeMode>(initialMode);

  // Android 系统手势条跟纸色走（≤14 生效；15+ 边到边由系统自动对比，设了也无妨）。
  // 状态栏在 App.tsx 里随同一个 context 切，两边一个来源。
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void NavigationBar.setBackgroundColorAsync(mode === 'dark' ? dark.paper : light.paper).catch(
      () => {},
    );
    void NavigationBar.setButtonStyleAsync(mode === 'dark' ? 'light' : 'dark').catch(() => {});
  }, [mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      colors: mode === 'dark' ? dark : light,
      // 先换脸再落库：写库失败不该挡住换肤，代价顶多是下次启动回到旧偏好
      setMode: (next) => {
        setModeState(next);
        void repo.setThemeMode(next);
      },
    }),
    [mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** 当前外观与色板；必须在 ThemeProvider 内使用。 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme 必须在 ThemeProvider 内使用');
  return ctx;
}

/**
 * 模块级样式工厂 → 随色板重建的样式表。
 * 工厂是模块级常量（引用恒定），memo 只在换肤那一刻重算一次。
 * 组件里写法：const styles = useThemedStyles(createStyles);
 */
export function useThemedStyles<T>(factory: (colors: Palette) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
