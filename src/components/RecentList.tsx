import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';

import { colors, fontFamily, numerals, spacing, type as t } from '../theme';
import { currencySymbol, formatFixed, formatRelativeDay } from '../utils/format';
import type { AssetItem, Expense } from '../data/types';
import { useConfirm } from './Confirm';
import { PressableScale } from './Motion';
import { DotLeader, SectionLabel } from './Rule';

interface Props {
  expenses: Expense[];
  assets: AssetItem[];
  /** 长按一条记录确认后删除；删除会把金额加回对应账户 */
  onDelete?: (id: string) => void;
  /** 点一行进编辑（只改金额与备注） */
  onEdit?: (e: Expense) => void;
}

/**
 * 最近记录：一条条点线账，名目在左、金额贴右，中间用点线连起来。
 * 没有卡片、没有彩色圆标、没有分割线，全靠点线引导。
 * 点行可改这笔；行尾一枚验讫章红的删除记号（与统计页明细同一语言），长按整行也可以删。
 */
export function RecentList({ expenses, assets, onDelete, onEdit }: Props) {
  const nameOf = (id: string) => assets.find((a) => a.id === id)?.name ?? '未知账户';
  const { confirm } = useConfirm();

  const confirmDelete = (e: Expense) => {
    if (!onDelete) return;
    void confirm({
      title: '删除这笔支出',
      message: `「${e.note}」${currencySymbol(e.currency)}${formatFixed(e.amount)}\n金额会加回「${nameOf(e.accountId)}」。`,
      confirmText: '删除',
      destructive: true,
    }).then((ok) => {
      if (ok) onDelete(e.id);
    });
  };

  return (
    <View style={styles.section}>
      <SectionLabel latin="RECENT" cn="最近记录" />

      {expenses.length === 0 ? (
        <Text style={styles.empty}>还没有记录，点下面的圆键记一笔</Text>
      ) : (
        expenses.map((e) => (
          <PressableScale
            key={e.id}
            style={styles.row}
            pressTint
            onPress={() => onEdit?.(e)}
            onLongPress={() => confirmDelete(e)}
            delayLongPress={400}
            accessibilityLabel={`${e.note}，${currencySymbol(e.currency)}${formatFixed(e.amount)}，点按修改，长按删除`}
          >
            <View style={styles.main}>
              <Text style={styles.note} numberOfLines={1}>
                {e.note}
              </Text>
              <Text style={styles.sub}>
                {nameOf(e.accountId)}　{formatRelativeDay(e.date)}
              </Text>
            </View>
            <DotLeader />
            <Text style={styles.amt}>−{currencySymbol(e.currency)}{formatFixed(e.amount)}</Text>
            {onDelete ? (
              <PressableScale
                onPress={() => confirmDelete(e)}
                style={styles.trash}
                pressTint
                accessibilityLabel={`删除${e.note}`}
              >
                <Trash2 size={15} color={colors.stamp} strokeWidth={1.7} />
              </PressableScale>
            ) : null}
          </PressableScale>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing(6),
  },
  empty: {
    fontFamily: fontFamily.sans,
    fontSize: t.body,
    color: colors.dimInk,
    paddingVertical: spacing(8),
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingVertical: spacing(2.5),
    minHeight: 44,
  },
  /** 行尾删除记号：44pt 命中区，视觉收到图标大小；整行是 baseline 对齐，这里单独居中 */
  trash: {
    width: 36,
    height: 44,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing(1.5),
    marginRight: -spacing(3),
    borderRadius: 6,
  },
  main: {
    maxWidth: '58%',
  },
  note: {
    fontFamily: fontFamily.sans,
    fontSize: t.body,
    color: colors.ink,
  },
  sub: {
    fontFamily: fontFamily.mono,
    fontSize: t.tiny,
    color: colors.dimInk,
    letterSpacing: 0.3,
    marginTop: spacing(0.5),
  },
  amt: {
    fontFamily: fontFamily.monoMed,
    fontSize: 15,
    color: colors.ink,
    ...numerals,
  },
});
