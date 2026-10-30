import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutGrid, Plus, TrendingUp, User, Wallet, type LucideIcon } from 'lucide-react-native';

import { fontFamily, radius, spacing, type as t, type Palette } from '../theme';
import { useTheme, useThemedStyles } from '../state/ThemeContext';
import { PressableScale } from './Motion';
import { DashedRule } from './Rule';

export type TabKey = 'home' | 'assets' | 'stats' | 'me';

interface Props {
  active: TabKey;
  onChange: (key: TabKey) => void;
  onAdd: () => void;
}

const TABS: { key: TabKey; label: string; Icon: LucideIcon }[] = [
  { key: 'home', label: '总览', Icon: LayoutGrid },
  { key: 'assets', label: '资产', Icon: Wallet },
  { key: 'stats', label: '统计', Icon: TrendingUp },
  { key: 'me', label: '我的', Icon: User },
];

/**
 * 底部导航：顶上一条分段虚线（凭条的撕口），正中一枚实心印字圆键。
 * 圆键外圈用纸色描一圈，正好盖住穿过它的虚线。
 */
export function TabBar({ active, onChange, onAdd }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing(3)) }]}>
      <DashedRule />

      <View style={styles.row}>
        {TABS.slice(0, 2).map((tab) => (
          <TabItem key={tab.key} tab={tab} active={active === tab.key} onPress={() => onChange(tab.key)} />
        ))}

        <View style={styles.addSlot}>
          <PressableScale
            onPress={onAdd}
            style={styles.btn}
            pressOpacity={0.85}
            accessibilityLabel="记一笔"
          >
            <Plus size={26} color={colors.onInk} strokeWidth={1.8} />
          </PressableScale>
        </View>

        {TABS.slice(2).map((tab) => (
          <TabItem key={tab.key} tab={tab} active={active === tab.key} onPress={() => onChange(tab.key)} />
        ))}
      </View>
    </View>
  );
}

function TabItem({
  tab,
  active,
  onPress,
}: {
  tab: { label: string; Icon: LucideIcon };
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const tint = active ? colors.ink : colors.dimInk;
  const { Icon } = tab;
  return (
    <PressableScale onPress={onPress} style={styles.item} pressTint accessibilityLabel={tab.label}>
      <Icon size={20} color={tint} strokeWidth={1.7} />
      <Text style={[styles.label, { color: tint }]}>{tab.label}</Text>
    </PressableScale>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
  bar: {
    backgroundColor: colors.paper,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: spacing(3),
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1.25),
    minHeight: 48,
    borderRadius: 6,
  },
  label: {
    fontFamily: fontFamily.mono,
    fontSize: t.tiny,
    letterSpacing: 1,
  },
  addSlot: {
    width: 74,
    alignItems: 'center',
  },
  btn: {
    width: 62,
    height: 62,
    borderRadius: radius.ring,
    backgroundColor: colors.ink,
    borderWidth: 5, // 这圈纸色把背后的虚线盖断，像盖章压住纸
    borderColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -spacing(8),
  },
});
