import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  LayoutAnimation,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';

import type { AssetGroup, AssetItem, Rate } from '../data/types';
import { baseValueOf, cnyToBase, toCny } from '../data/sample';
import { useApp } from '../state/AppContext';
import { AssetEditor } from '../components/AssetEditor';
import { AssetIcon } from '../components/AssetIcon';
import { EnterView, motionOff, PressableScale } from '../components/Motion';
import { RollingNumber } from '../components/RollingNumber';
import { DashedRule, DotLeader, SectionLabel } from '../components/Rule';
import { fontFamily, motion, numerals, radius, spacing, type as t, type Palette } from '../theme';
import { useTheme, useThemedStyles } from '../state/ThemeContext';
import { currencySymbol, formatNumber } from '../utils/format';
import { ASSET_GROUP_LABEL, ASSET_GROUP_LATIN, ASSET_TYPE_LATIN } from '../utils/labels';

const H_PADDING = spacing(6);
/** 小计金额（17pt）每个数码的行高，数字滚动按它分格 */
const SUBTOTAL_CELL = Math.round(17 * 1.2);
/** 长按多久才算拿起；之前的移动留给点击与页面滚动 */
const DRAG_PRESS_MS = 350;

// Android 要开这个实验开关，LayoutAnimation（换位时其余行让位）才生效。
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** 换位时其余行的让位动画，时长对齐 theme.motion.base */
const SHIFT_ANIM = {
  duration: 160,
  update: { type: LayoutAnimation.Types.easeInEaseOut },
} as const;

/** 编辑弹层的打开态：item 为空表示新增 */
interface EditorState {
  item: AssetItem | null;
  group: AssetGroup;
}

/** 行的实测盒子：y 是行在段内的偏移，拖拽映射手指 → 槽位用 */
interface RowBox {
  y: number;
  h: number;
}

/** 一次拖拽的全部现场：组、被拖项、组内当前顺序 */
interface DragState {
  group: AssetGroup;
  id: string;
  order: string[];
  /** 按下点相对行顶边的偏移 */
  grabOffset: number;
  /** 被拖行高（原位置占位也用它） */
  height: number;
}

/**
 * 资产页：把同一种「资产项」按分组列成两段对账清单。
 * 可流动现金等值物 / 固定资产与实物各一段，行内是「名目 · 类型币种 …… 金额」，
 * 每段末尾给小计，非基准币种的行再补一行「≈ 折算」。
 * 组内长按可拖动调序：拿起后原位留一张虚线空单，浮层跟手，其余行滑动让位。
 */
export function AssetsScreen() {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { assets, rates, baseCurrency, reorderAssets } = useApp();
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  /** 长按倒计时已到：这一按可能是拖拽，先锁住滚动（见 SortableRow 注释） */
  const [armed, setArmed] = useState(false);

  const liquid = useMemo(() => assets.filter((a) => a.group === 'liquid'), [assets]);
  const fixed = useMemo(() => assets.filter((a) => a.group === 'fixed'), [assets]);

  const sumOf = (list: AssetItem[]) => list.reduce((sum, a) => sum + toCny(a.value, a.currency, rates), 0);
  const liquidCny = sumOf(liquid);
  const fixedCny = sumOf(fixed);

  // —— 拖拽的测量现场（走 ref：手势回调保持稳定，PanResponder 不中途重建）——
  const assetsRef = useRef(assets);
  assetsRef.current = assets;
  const rowBoxes = useRef<Record<string, RowBox>>({});
  const secBoxes = useRef<Partial<Record<AssetGroup, { y: number; h: number }>>>({});
  const scrollY = useRef(0);
  const dragRef = useRef<DragState | null>(null);
  /** 拿起瞬间定死的槽位几何：行区顶部的屏幕 y + 组内各行高（拖动中只换顺序不换高度） */
  const dragGeom = useRef({ anchorY: 0, heights: [] as number[] });
  /** 浮层跟手位移：原生驱动的 translateY。走 React 的话每次 move 都全页重渲染，浮层反而追不上手指。 */
  const floatY = useRef(new Animated.Value(0)).current;

  const setDragLive = (d: DragState | null) => {
    dragRef.current = d;
    setDrag(d);
  };

  const handleDragStart = useCallback((group: AssetGroup, id: string, pageY: number) => {
    if (dragRef.current) return;
    const items = assetsRef.current.filter((a) => a.group === group);
    const order = items.map((a) => a.id);
    if (order.length < 2) return;
    const sec = secBoxes.current[group];
    const firstBox = rowBoxes.current[order[0]];
    if (!sec || !firstBox) return;

    const heights = order.map((oid) => rowBoxes.current[oid]?.h ?? 44);
    const anchorY = sec.y + firstBox.y - scrollY.current;
    const idx = order.indexOf(id);
    const rowTop = anchorY + heights.slice(0, idx).reduce((s, h) => s + h, 0);
    dragGeom.current = { anchorY, heights };
    setArmed(false);
    floatY.setValue(rowTop);
    setDragLive({
      group,
      id,
      order,
      grabOffset: pageY - rowTop,
      height: heights[idx] ?? 44,
    });
  }, [floatY]);

  const handleDragMove = useCallback((pageY: number) => {
    const d = dragRef.current;
    if (!d) return;
    const { anchorY, heights } = dragGeom.current;

    // 跟手只推这条原生驱动的位移，不进 React；setState 只留给真正的换位。
    floatY.setValue(pageY - d.grabOffset);

    // 手指越过第 i 槽的底部就插到 i+1；夹在本组范围内（只在组内换位）。
    let target = 0;
    let top = anchorY;
    for (const h of heights) {
      if (pageY >= top + h) target += 1;
      top += h;
    }
    target = Math.min(target, heights.length - 1);

    const from = d.order.indexOf(d.id);
    if (target === from) return;
    const order = d.order.slice();
    order.splice(from, 1);
    order.splice(target, 0, d.id);
    LayoutAnimation.configureNext(SHIFT_ANIM);
    setDragLive({ ...d, order });
  }, [floatY]);

  const handleDragEnd = useCallback(() => {
    const d = dragRef.current;
    setDragLive(null);
    setArmed(false);
    if (!d) return;
    const original = assetsRef.current.filter((a) => a.group === d.group).map((a) => a.id);
    const changed = d.order.length !== original.length || d.order.some((id, i) => id !== original[i]);
    if (changed) void reorderAssets(d.order);
  }, [reorderAssets]);

  const onRowLayoutBox = useCallback((id: string, box: RowBox) => {
    rowBoxes.current[id] = box;
  }, []);

  const onSectionLayout = useCallback((group: AssetGroup, box: { y: number; h: number }) => {
    secBoxes.current[group] = box;
  }, []);

  /** 长按倒计时到点：先锁滚动，给随后的移动让出 JS 通道（见 SortableRow 注释） */
  const onArm = useCallback(() => {
    if (!dragRef.current) setArmed(true);
  }, []);
  const onDisarm = useCallback(() => setArmed(false), []);

  // 拖拽中的显示顺序覆盖（只影响被拖的那组）
  const displayOf = (group: AssetGroup, items: AssetItem[]): AssetItem[] => {
    if (!drag || drag.group !== group) return items;
    const byId = new Map(items.map((a) => [a.id, a] as const));
    return drag.order.map((id) => byId.get(id)).filter((a): a is AssetItem => a != null);
  };

  const dragItem = drag ? assets.find((a) => a.id === drag.id) : undefined;

  return (
    <EnterView style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing(2), paddingBottom: spacing(10) }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={drag === null && !armed}
        onScroll={(e) => {
          scrollY.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        <View style={styles.head}>
          <Text style={styles.brandName}>资产清单</Text>
          <Text style={styles.brandSub}>ASSET INVENTORY</Text>
        </View>

        <DashedRule />

        <GroupSection
          group="liquid"
          displayed={displayOf('liquid', liquid)}
          subtotalCny={liquidCny}
          baseCurrency={baseCurrency}
          rates={rates}
          draggingId={drag?.group === 'liquid' ? drag.id : null}
          holeHeight={drag?.group === 'liquid' ? drag.height : 44}
          onPressItem={(item) => setEditor({ item, group: 'liquid' })}
          onAdd={() => setEditor({ item: null, group: 'liquid' })}
          onRowLayoutBox={onRowLayoutBox}
          onSectionLayout={onSectionLayout}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onArm={onArm}
          onDisarm={onDisarm}
        />
        <GroupSection
          group="fixed"
          displayed={displayOf('fixed', fixed)}
          subtotalCny={fixedCny}
          baseCurrency={baseCurrency}
          rates={rates}
          draggingId={drag?.group === 'fixed' ? drag.id : null}
          holeHeight={drag?.group === 'fixed' ? drag.height : 44}
          onPressItem={(item) => setEditor({ item, group: 'fixed' })}
          onAdd={() => setEditor({ item: null, group: 'fixed' })}
          onRowLayoutBox={onRowLayoutBox}
          onSectionLayout={onSectionLayout}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onArm={onArm}
          onDisarm={onDisarm}
        />

        <View style={styles.grand}>
          <TotalLine
            label="合计 TOTAL"
            value={cnyToBase(liquidCny + fixedCny, baseCurrency, rates)}
            currency={baseCurrency}
            strong
          />
        </View>

        {assets.length === 0 ? (
          <Text style={styles.empty}>还没有资产项，点下面任一段的「新增」开始</Text>
        ) : null}
      </ScrollView>

      {/* 跟手浮层：拿起的那行原样拓一份，纸色垫底加投影，不接任何触点；
          位置是原生驱动的 translateY，move 事件再密也不重渲染 */}
      {drag && dragItem ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.floatCard, { transform: [{ translateY: floatY }] }]}
        >
          <AssetRow
            item={dragItem}
            baseCurrency={baseCurrency}
            rates={rates}
            onPress={() => {}}
          />
        </Animated.View>
      ) : null}

      <AssetEditor
        visible={editor !== null}
        initial={editor?.item ?? null}
        defaultGroup={editor?.group ?? 'liquid'}
        onClose={() => setEditor(null)}
      />
    </EnterView>
  );
}

/** 小计 / 合计行。memo：拖拽换位、行内其他状态变化时小计值往往没变，
 *  跳过重渲染也就跳过了 RollingNumber 里上百个数码 Text 的和解。 */
const TotalLine = memo(function TotalLine({
  label,
  value,
  currency,
  strong,
  roll,
}: {
  label: string;
  value: number;
  currency: string;
  strong?: boolean;
  /** 金额逐位滚动（只给小计用；合计保持瞬时，避免同屏两处数字同时动） */
  roll?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const text = `${currencySymbol(currency)}${formatNumber(Math.round(value * 100) / 100)}`;

  return (
    <View style={styles.totalLine}>
      <Text style={[styles.totalLabel, strong && styles.totalLabelStrong]}>{label}</Text>
      <DotLeader />
      {roll ? (
        <RollingNumber text={text} cellHeight={SUBTOTAL_CELL} style={[styles.totalValue, strong && styles.totalValueStrong]} />
      ) : (
        <Text style={[styles.totalValue, strong && styles.totalValueStrong]}>{text}</Text>
      )}
    </View>
  );
});

function GroupSection({
  group,
  displayed,
  subtotalCny,
  baseCurrency,
  rates,
  draggingId,
  holeHeight,
  onPressItem,
  onAdd,
  onRowLayoutBox,
  onSectionLayout,
  onDragStart,
  onDragMove,
  onDragEnd,
  onArm,
  onDisarm,
}: {
  group: AssetGroup;
  /** 实际渲染顺序（拖拽中是拖拽顺序，平时等于组内顺序） */
  displayed: AssetItem[];
  subtotalCny: number;
  baseCurrency: string;
  rates: Rate[];
  /** 正被长按拖动的行；该行原位渲染成虚线空单 */
  draggingId: string | null;
  holeHeight: number;
  onPressItem: (item: AssetItem) => void;
  onAdd: () => void;
  onRowLayoutBox: (id: string, box: RowBox) => void;
  onSectionLayout: (group: AssetGroup, box: { y: number; h: number }) => void;
  onDragStart: (group: AssetGroup, id: string, pageY: number) => void;
  onDragMove: (pageY: number) => void;
  onDragEnd: () => void;
  onArm: () => void;
  onDisarm: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const subtotalBase = cnyToBase(subtotalCny, baseCurrency, rates);

  return (
    <View
      style={styles.section}
      onLayout={(e) =>
        onSectionLayout(group, { y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height })
      }
    >
      <SectionLabel latin={ASSET_GROUP_LATIN[group]} cn={ASSET_GROUP_LABEL[group]} />

      {displayed.length === 0 ? (
        <Text style={styles.sectionEmpty}>暂无</Text>
      ) : (
        displayed.map((item) => (
          <SortableRow
            key={item.id}
            id={item.id}
            group={group}
            onTap={() => onPressItem(item)}
            onLayoutBox={onRowLayoutBox}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
            onArm={onArm}
            onDisarm={onDisarm}
          >
            {draggingId === item.id ? (
              <View style={[styles.hole, { height: holeHeight }]} />
            ) : (
              <AssetRow
                item={item}
                baseCurrency={baseCurrency}
                rates={rates}
                onPress={() => onPressItem(item)}
              />
            )}
          </SortableRow>
        ))
      )}

      <View style={styles.subtotal}>
        <TotalLine label="小计 SUBTOTAL" value={subtotalBase} currency={baseCurrency} strong roll />
      </View>

      <PressableScale
        onPress={onAdd}
        style={styles.addRow}
        pressTint
        accessibilityLabel={`新增${ASSET_GROUP_LABEL[group]}`}
      >
        <Plus size={16} color={colors.dimInk} strokeWidth={1.8} />
        <Text style={styles.addText}>新增</Text>
      </PressableScale>
    </View>
  );
}

/**
 * 可排序的行外壳：落在行上的整只手势都由本层掌管。
 *
 * 为什么按下瞬间就在捕获阶段认领：RN 的 responder 协商在已有 responder 时，
 * 是从「事件目标与当前 responder 的公共祖先」开始问起的——手指停在行内时公共
 * 祖先就是行内的 Pressable，作为祖先的本层永远不会被询问，长按后无法中途
 * 接管。所以必须在起手时赢下响应权，行内的点按改由本层代发。
 *
 * 为什么不拦原生（onShouldBlockNativeResponder 返回 false）：快速滑动时原生
 * ScrollView 仍会照常截走手势去滚动，滚动体验不变。真正的拖拽靠按住满
 * DRAG_PRESS_MS 时（onArm）把 scrollEnabled 关掉——手指还停着，这个改动有
 * 充足时间落到原生层——之后的移动原生抢不走，全部流进本层。
 */
function SortableRow({
  id,
  group,
  onTap,
  onLayoutBox,
  onDragStart,
  onDragMove,
  onDragEnd,
  onArm,
  onDisarm,
  children,
}: {
  id: string;
  group: AssetGroup;
  onTap: () => void;
  onLayoutBox: (id: string, box: RowBox) => void;
  onDragStart: (group: AssetGroup, id: string, pageY: number) => void;
  onDragMove: (pageY: number) => void;
  onDragEnd: () => void;
  onArm: () => void;
  onDisarm: () => void;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const touchStart = useRef(0);
  const dragging = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;

  // 点按反馈由本层代播（行内 Pressable 收不到事件了）：缩放 + 浅印，参数对齐 PressableScale。
  const scale = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);
  const pressTo = (on: boolean) => {
    setPressed(on);
    if (motionOff()) {
      scale.setValue(on ? motion.press : 1);
      return;
    }
    Animated.timing(scale, {
      toValue: on ? motion.press : 1,
      duration: motion.fast,
      easing: motion.easing,
      useNativeDriver: true,
    }).start();
  };

  useEffect(
    () => () => {
      if (holdTimer.current != null) clearTimeout(holdTimer.current);
    },
    [],
  );

  const cancelHold = () => {
    if (holdTimer.current != null) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    onDisarm();
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponderCapture: () => true,
        onShouldBlockNativeResponder: () => false,
        onPanResponderGrant: () => {
          touchStart.current = Date.now();
          dragging.current = false;
          pressTo(true);
          holdTimer.current = setTimeout(onArm, DRAG_PRESS_MS);
        },
        onPanResponderMove: (e, g) => {
          if (!dragging.current) {
            if (Date.now() - touchStart.current < DRAG_PRESS_MS || Math.abs(g.dy) <= 4) return;
            dragging.current = true;
            pressTo(false);
            onDragStart(group, id, e.nativeEvent.pageY);
          }
          onDragMove(e.nativeEvent.pageY);
        },
        onPanResponderRelease: (_e, g) => {
          if (dragging.current) {
            onDragEnd();
          } else if (Math.abs(g.dy) < 4) {
            onTapRef.current();
          }
          pressTo(false);
          cancelHold();
        },
        onPanResponderTerminate: () => {
          if (dragging.current) onDragEnd();
          pressTo(false);
          cancelHold();
        },
      }),
    [group, id, onArm, onDisarm, onDragStart, onDragMove, onDragEnd],
  );

  return (
    <Animated.View
      {...pan.panHandlers}
      onLayout={(e) =>
        onLayoutBox(id, { y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height })
      }
      style={pressed ? { backgroundColor: colors.press } : null}
    >
      {children}
    </Animated.View>
  );
}

function AssetRowInner({
  item,
  baseCurrency,
  rates,
  onPress,
}: {
  item: AssetItem;
  baseCurrency: string;
  rates: Rate[];
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const isForeign = item.currency !== baseCurrency;
  const baseValue = baseValueOf(item.value, item.currency, baseCurrency, rates);
  // 房产的面积 / 区域跟在类型标签后（一行收口，超宽截断）
  const estate = [
    item.areaM2 != null ? `${item.areaM2}㎡` : null,
    item.region ?? null,
  ].filter(Boolean).join(' · ');

  return (
    <PressableScale onPress={onPress} style={styles.row} pressTint accessibilityLabel={item.name}>
      <View style={styles.rowLine}>
        <AssetIcon name={item.name} type={item.type} currency={item.currency} iconKey={item.iconKey} size={36} />
        <View style={styles.rowMain}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.tag} numberOfLines={1}>
            {ASSET_TYPE_LATIN[item.type]} · {item.currency}
            {estate ? ` · ${estate}` : ''}
          </Text>
        </View>
        <DotLeader />
        <Text style={[styles.value, item.value < 0 && styles.negative]}>
          {currencySymbol(item.currency)}
          {formatNumber(item.value)}
        </Text>
      </View>
      {isForeign ? (
        <Text style={styles.conv}>
          ≈ {currencySymbol(baseCurrency)}
          {formatNumber(Math.round(baseValue * 100) / 100)}
        </Text>
      ) : null}
    </PressableScale>
  );
}

/**
 * 拖拽换位时序上只有行的位置在变，行内容（名目 / 金额 / 折算）不动 ——
 * memo 住后换位那一帧不再重渲染任何一行，JS 只剩外壳挪位 + LayoutAnimation。
 * onPress 是调用点的内联闭包，比较时故意忽略。
 */
const AssetRow = memo(
  AssetRowInner,
  (p, n) => p.item === n.item && p.baseCurrency === n.baseCurrency && p.rates === n.rates,
);

const createStyles = (colors: Palette) =>
  StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  scroll: {
    paddingHorizontal: H_PADDING,
  },
  head: {
    alignItems: 'center',
    paddingTop: spacing(2),
    paddingBottom: spacing(4),
  },
  brandName: {
    fontFamily: fontFamily.sansBold,
    fontSize: 17,
    letterSpacing: 6,
    color: colors.ink,
  },
  brandSub: {
    fontFamily: fontFamily.mono,
    fontSize: t.tiny,
    letterSpacing: 3,
    color: colors.dimInk,
    marginTop: spacing(2),
  },
  section: {
    marginTop: spacing(2),
  },
  sectionEmpty: {
    fontFamily: fontFamily.sans,
    fontSize: t.body,
    color: colors.dimInk,
    textAlign: 'center',
    paddingVertical: spacing(4),
  },
  /** 被拖行原位留下的虚线空单 */
  hole: {
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.dashSoft,
  },
  /** 跟手浮层：略亮的纸垫底 + 投影，宽度对齐清单正文；位置由 translateY 驱动（top:0 起步） */
  floatCard: {
    position: 'absolute',
    top: 0,
    left: H_PADDING,
    right: H_PADDING,
    backgroundColor: colors.paperHi,
    borderRadius: 8,
    paddingHorizontal: spacing(2),
    shadowColor: colors.shadow,
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  row: {
    paddingVertical: spacing(2.5),
    minHeight: 44,
  },
  rowLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2.5),
  },
  rowMain: {
    maxWidth: '50%',
  },
  name: {
    fontFamily: fontFamily.sans,
    fontSize: t.body,
    color: colors.ink,
  },
  tag: {
    fontFamily: fontFamily.mono,
    fontSize: t.tiny,
    color: colors.dimInk,
    letterSpacing: 0.5,
    marginTop: spacing(0.5),
  },
  value: {
    fontFamily: fontFamily.monoMed,
    fontSize: 15,
    color: colors.ink,
    ...numerals,
  },
  negative: {
    color: colors.stamp,
  },
  conv: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    letterSpacing: 0.3,
    color: colors.dimInk,
    textAlign: 'right',
    marginTop: spacing(0.5),
    ...numerals,
  },
  subtotal: {
    marginTop: spacing(1),
    borderTopWidth: 1,
    borderTopColor: colors.dashSoft,
    paddingTop: spacing(1),
  },
  grand: {
    marginTop: spacing(5),
  },
  totalLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingVertical: spacing(1.5),
  },
  totalLabel: {
    fontFamily: fontFamily.sans,
    fontSize: t.small,
    color: colors.dimInk,
  },
  totalLabelStrong: {
    color: colors.ink,
  },
  totalValue: {
    fontFamily: fontFamily.monoMed,
    fontSize: 15,
    color: colors.ink,
    ...numerals,
  },
  totalValueStrong: {
    fontFamily: fontFamily.monoSemi,
    fontSize: 17,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1.5),
    borderWidth: 1,
    borderColor: colors.dash,
    borderRadius: radius.ring,
    paddingHorizontal: spacing(5),
    alignSelf: 'center',
    minHeight: 44,
    marginTop: spacing(2),
  },
  addText: {
    fontFamily: fontFamily.mono,
    fontSize: t.small,
    letterSpacing: 1,
    color: colors.dimInk,
  },
  empty: {
    fontFamily: fontFamily.sans,
    fontSize: t.body,
    color: colors.dimInk,
    textAlign: 'center',
    paddingVertical: spacing(6),
  },
});
