import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { fontFamily, spacing, type as t, type Palette } from '../theme';
import { useTheme, useThemedStyles } from '../state/ThemeContext';

/**
 * 凭条的三种「印刷记号」。
 * 虚线/点线都不用 borderStyle（Android 上不总是渲染），而是排一行小方块，各家一致。
 */

const DASHES = 90;

/** 分段虚线：横贯整幅，像凭条被撕开的地方。 */
export function DashedRule({ style, color }: { style?: StyleProp<ViewStyle>; color?: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const c = color ?? colors.dash;
  return (
    <View style={[styles.dashRow, style]}>
      {Array.from({ length: DASHES }).map((_, i) => (
        <View key={i} style={[styles.dash, { backgroundColor: c }]} />
      ))}
    </View>
  );
}

/** 点线引导：夹在项目名和金额之间，把它俩连成一行对账。 */
export function DotLeader({ style }: { style?: StyleProp<ViewStyle> }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.leaderRow, style]}>
      {Array.from({ length: 60 }).map((_, i) => (
        <View key={i} style={styles.dot} />
      ))}
    </View>
  );
}

/** 分区小标题：等宽字母 + 中文，居中，两边用破折号收口。 */
export function SectionLabel({ latin, cn }: { latin: string; cn: string }) {
  const styles = useThemedStyles(createStyles);
  return <Text style={styles.sectionLabel}>— {latin} {cn} —</Text>;
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    dashRow: {
      flexDirection: 'row',
      height: 1,
      overflow: 'hidden',
    },
    dash: {
      width: 4,
      height: 1,
      marginRight: 4,
    },
    leaderRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      overflow: 'hidden',
      marginHorizontal: spacing(2),
    },
    dot: {
      width: 1.4,
      height: 1.4,
      borderRadius: 1,
      backgroundColor: colors.dashSoft,
      marginRight: 3,
    },
    sectionLabel: {
      fontFamily: fontFamily.mono,
      fontSize: t.label,
      letterSpacing: 2,
      color: colors.dimInk,
      textAlign: 'center',
      marginVertical: spacing(3),
    },
  });
