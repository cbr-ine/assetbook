import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Check, Plus, Trash2, X } from 'lucide-react-native';

import {
  ICON_GROUP_META,
  ICONS,
  customIconEntry,
  customIconKey,
  parseCustomIconKey,
  resolveIcon,
} from '../data/icons';
import { listCustomIcons, persistCustomIcon, removeCustomIcon } from '../utils/customIcons';
import { NEGATIVE_TYPES, TYPE_GROUP, type AssetGroup, type AssetItem, type AssetType } from '../data/types';
import { useApp } from '../state/AppContext';
import { fontFamily, numerals, radius, spacing, type as t, type Palette } from '../theme';
import { useTheme, useThemedStyles } from '../state/ThemeContext';
import { ASSET_TYPES, ASSET_TYPE_LABEL } from '../utils/labels';
import { round2 } from '../utils/format';
import { migratePhotoIfNeeded, persistPhoto, removeManagedPhoto } from '../utils/photos';
import { useConfirm } from './Confirm';
import { IconFace } from './AssetIcon';
import { PressableScale } from './Motion';
import { DashedRule, SectionLabel } from './Rule';
import { Sheet } from './Sheet';

interface Props {
  visible: boolean;
  /** 编辑已有项时传入；新增为 null */
  initial: AssetItem | null;
  /** 新增时的默认分组 */
  defaultGroup: AssetGroup;
  onClose: () => void;
}

/** 只保留数字与一个小数点，避免软键盘外的意外输入 */
function sanitizeAmount(text: string): string {
  const cleaned = text.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  return parts.length <= 1 ? cleaned : `${parts[0]}.${parts.slice(1).join('')}`;
}

/**
 * 资产项编辑弹层：新增 / 修改单个资产项。
 * 凭条质感：纸底、虚线分段、等宽输入；分组与类型、币种都是横向胶囊选择。
 */
export function AssetEditor({ visible, initial, defaultGroup, onClose }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { rates, baseCurrency, saveAsset, deleteAsset } = useApp();
  const { confirm } = useConfirm();

  const currencies = useMemo(() => {
    const set = new Set<string>(rates.map((r) => r.currency));
    set.add(baseCurrency);
    set.add('CNY');
    return Array.from(set).sort();
  }, [rates, baseCurrency]);

  // 三个文本框的值走 ref：键入时不 setState，弹层里十几枚胶囊就不会被拖着重渲染（输入卡顿的根因）。
  const nameRef = useRef('');
  const amountRef = useRef('');
  const noteRef = useRef('');
  /** 房产的区域与建筑面积，同样走 ref */
  const regionRef = useRef('');
  const areaRef = useRef('');
  /** 打开 / 换编辑对象时自增，驱动 LocalInput 回填 */
  const [revision, setRevision] = useState(0);
  const [currency, setCurrency] = useState('CNY');
  const [type, setType] = useState<AssetType>('ewallet');
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  /** 手选覆盖；undefined = 跟名称走 */
  const [iconKey, setIconKey] = useState<string | undefined>(undefined);
  const [iconOpen, setIconOpen] = useState(false);
  const [nameTick, setNameTick] = useState(0);

  // 每次打开时用 initial 重置表单。
  useEffect(() => {
    if (!visible) return;
    nameRef.current = initial?.name ?? '';
    // 回填先取整到分：余额可能是扣款扣出来的浮点值（-0.3000…04），别让残渣进输入框
    amountRef.current = initial ? String(round2(Math.abs(initial.value))) : '';
    noteRef.current = initial?.note ?? '';
    regionRef.current = initial?.region ?? '';
    areaRef.current = initial?.areaM2 != null ? String(initial.areaM2) : '';
    setCurrency(initial?.currency ?? baseCurrency);
    setType(initial?.type ?? (defaultGroup === 'fixed' ? 'physical' : 'ewallet'));
    setPhotoUri(initial?.photoUri);
    // 旧账的照片可能还躺在缓存目录（清缓存即失效），编辑一次就搬进文档目录
    if (initial?.photoUri) {
      void migratePhotoIfNeeded(initial.photoUri).then((next) => {
        if (next && next !== initial.photoUri) setPhotoUri(next);
      });
    }
    setIconKey(initial?.iconKey);
    setIconOpen(false);
    setRevision((r) => r + 1);
  }, [visible, initial, defaultGroup, baseCurrency]);

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!res.canceled && res.assets.length > 0) {
      // 相册给的 URI 在缓存目录，随时可能被系统清掉：拷进文档目录再存
      try {
        const next = await persistPhoto(res.assets[0].uri);
        // 连续换图时，把上一张还没落库的临时文件清掉（原账的照片不动）
        if (photoUri && photoUri !== initial?.photoUri) void removeManagedPhoto(photoUri);
        setPhotoUri(next);
      } catch {
        setPhotoUri(res.assets[0].uri); // 拷不进去就退回旧行为，别挡着记账
      }
    }
  };

  const onSave = async () => {
    const num = Number.parseFloat(amountRef.current) || 0;
    // 欠款类（信用卡/花呗/白条、应付）统一存负数（types.ts 约定），其余按输入原样。
    const value = NEGATIVE_TYPES.includes(type) ? -Math.abs(num) : num;
    const area = Number.parseFloat(areaRef.current);
    const item: AssetItem = {
      id: initial?.id ?? '',
      name: nameRef.current.trim() || '未命名资产',
      value,
      currency,
      group: TYPE_GROUP[type],
      type,
      photoUri,
      iconKey,
      note: noteRef.current.trim() || undefined,
      sort: initial?.sort ?? 0,
      areaM2: Number.isFinite(area) && area > 0 ? area : undefined,
      region: regionRef.current.trim() || undefined,
    };
    await saveAsset(item);
    // 照片换过 / 移除过时，把旧文件清掉（受管的才清），不让文档目录积孤儿
    if (initial?.photoUri && initial.photoUri !== photoUri) {
      void removeManagedPhoto(initial.photoUri);
    }
    onClose();
  };

  const onDelete = () => {
    if (!initial) return;
    void confirm({
      title: '删除资产项',
      message: `确定删除「${initial.name}」吗？此操作不可撤销。`,
      confirmText: '删除',
      destructive: true,
    }).then((ok) => {
      if (ok) void deleteAsset(initial.id).then(onClose);
    });
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          <PressableScale onPress={onClose} style={styles.iconBtn} accessibilityLabel="关闭">
            <X size={22} color={colors.ink} strokeWidth={1.7} />
          </PressableScale>
          <Text style={styles.title}>{initial ? '编辑资产项' : '新增资产项'}</Text>
          <PressableScale onPress={onSave} style={styles.iconBtn} accessibilityLabel="保存">
            <Check size={22} color={colors.ink} strokeWidth={1.8} />
          </PressableScale>
        </View>

        <DashedRule />

        <Field label="名称 NAME">
          <LocalInput
            revision={revision}
            initial={initial?.name ?? ''}
            onText={(v) => {
              nameRef.current = v;
              setNameTick((n) => n + 1);
            }}
            placeholder="例如：招行储蓄卡"
            placeholderTextColor={colors.dimInk}
            style={styles.input}
          />
        </Field>

        <SectionLabel latin="ICON" cn="类目图标" />
        <IconPicker
          name={nameRef.current}
          type={type}
          currency={currency}
          iconKey={iconKey}
          tick={nameTick}
          open={iconOpen}
          onToggle={() => setIconOpen((v) => !v)}
          onSelect={(id) => {
            setIconKey(id);
            setIconOpen(false);
          }}
          onAuto={() => {
            setIconKey(undefined);
            setIconOpen(false);
          }}
        />

        <Field label="金额 AMOUNT">
          <View style={styles.amountRow}>
            <Text style={styles.currencyMark}>{currency}</Text>
            <LocalInput
              revision={revision}
              initial={initial ? String(Math.abs(initial.value)) : ''}
              onText={(v) => (amountRef.current = v)}
              sanitize={sanitizeAmount}
              placeholder="0"
              placeholderTextColor={colors.dimInk}
              keyboardType="decimal-pad"
              style={[styles.input, styles.amountInput]}
            />
          </View>
          {type === 'credit' ? <Text style={styles.hint}>输入欠款金额即可，保存时自动记为负数；还清记 0</Text> : null}
          {type === 'payable' ? <Text style={styles.hint}>应付账户统一存为负数</Text> : null}
        </Field>

        <SectionLabel latin="CURRENCY" cn="币种" />
        <ChipRow options={currencies} active={currency} onSelect={setCurrency} />

        <SectionLabel latin="TYPE" cn="类型（分组由此决定）" />
        <ChipRow
          options={ASSET_TYPES}
          labelOf={(ty) => ASSET_TYPE_LABEL[ty]}
          active={type}
          onSelect={(ty) => setType(ty as AssetType)}
        />

        {type === 'physical' ? (
          <>
            <SectionLabel latin="PROPERTY" cn="房产信息" />
            <Field label="区域 REGION">
              <LocalInput
                revision={revision}
                initial={initial?.region ?? ''}
                onText={(v) => (regionRef.current = v)}
                placeholder="例如：杭州·西湖区"
                placeholderTextColor={colors.dimInk}
                style={styles.input}
              />
            </Field>
            <Field label="建筑面积 AREA（㎡）">
              <LocalInput
                revision={revision}
                initial={initial?.areaM2 != null ? String(initial.areaM2) : ''}
                onText={(v) => (areaRef.current = v)}
                sanitize={sanitizeAmount}
                placeholder="0"
                placeholderTextColor={colors.dimInk}
                keyboardType="decimal-pad"
                style={[styles.input, styles.amountInput]}
              />
            </Field>
          </>
        ) : null}

        {type === 'physical' ? (
          <>
            <SectionLabel latin="PHOTO" cn="实物照片" />
            <View style={styles.photoRow}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photo} />
              ) : (
                <PressableScale style={styles.photoEmpty} onPress={pickPhoto} pressTint>
                  <Text style={styles.photoHint}>选择照片</Text>
                </PressableScale>
              )}
              <View style={styles.photoBtns}>
                <PressableScale onPress={pickPhoto} style={styles.smallBtn} pressTint>
                  <Text style={styles.smallBtnText}>{photoUri ? '更换' : '选择'}</Text>
                </PressableScale>
                {photoUri ? (
                  <PressableScale onPress={() => setPhotoUri(undefined)} style={styles.smallBtn} pressTint>
                    <Text style={styles.smallBtnText}>移除</Text>
                  </PressableScale>
                ) : null}
              </View>
            </View>
          </>
        ) : null}

        <Field label="备注 NOTE">
          <LocalInput
            revision={revision}
            initial={initial?.note ?? ''}
            onText={(v) => (noteRef.current = v)}
            placeholder="可选"
            placeholderTextColor={colors.dimInk}
            style={styles.input}
          />
        </Field>

        {initial ? (
          <PressableScale onPress={onDelete} style={styles.deleteBtn} pressTint accessibilityLabel="删除资产项">
            <Trash2 size={18} color={colors.stamp} strokeWidth={1.7} />
            <Text style={styles.deleteText}>删除此项</Text>
          </PressableScale>
        ) : null}
      </ScrollView>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

/**
 * 键入只重渲染这一个叶子。数字键盘每键一次 JS 往返，
 * 若值放在弹层 state 里，整个表单（含十几枚动画胶囊）每键重渲染一次，真机上就是「卡卡的」；
 * 所以值经 onText 写到外层 ref，revision 变化（弹层打开 / 换编辑对象）时才回填 initial。
 */
function LocalInput({
  revision,
  initial,
  onText,
  sanitize,
  ...rest
}: {
  revision: number;
  initial: string;
  onText: (v: string) => void;
  sanitize?: (v: string) => string;
} & TextInputProps) {
  const [text, setText] = useState(initial);

  // 故意只依赖 revision：键入期间 initial 变化不回灌（受控回灌会抢光标）。
  useEffect(() => {
    setText(initial);
    onText(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);

  return (
    <TextInput
      value={text}
      onChangeText={(v) => {
        const s = sanitize ? sanitize(v) : v;
        setText(s);
        onText(s);
      }}
      {...rest}
    />
  );
}

function IconPicker({
  name,
  type,
  currency,
  iconKey,
  tick: _tick,
  open,
  onToggle,
  onSelect,
  onAuto,
}: {
  name: string;
  type: string;
  currency: string;
  iconKey?: string;
  tick: number;
  open: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  onAuto: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { confirm } = useConfirm();
  const current = resolveIcon({ name, type, currency, iconKey });
  const auto = iconKey == null;

  // 自定义上传的图标：展开时读一次目录（上传 / 删除后本地同步增删）
  const [customs, setCustoms] = useState<string[]>([]);
  useEffect(() => {
    if (open) void listCustomIcons().then(setCustoms);
  }, [open]);

  const upload = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (res.canceled || res.assets.length === 0) return;
    let uri = res.assets[0].uri;
    try {
      uri = await persistCustomIcon(uri);
    } catch {
      /* 拷不进文档目录（如 web 预览）就先用原 URI，本次会话内可用 */
    }
    setCustoms((prev) => [uri, ...prev.filter((u) => u !== uri)]);
    onSelect(customIconKey(uri));
  };

  const removeCustom = (uri: string) => {
    void confirm({
      title: '删除自定义图标',
      message: '正在使用这枚图标的资产会退回按名称自动匹配。',
      confirmText: '删除',
      destructive: true,
    }).then((ok) => {
      if (!ok) return;
      void removeCustomIcon(uri);
      setCustoms((prev) => prev.filter((u) => u !== uri));
      if (parseCustomIconKey(iconKey ?? '') === uri) onAuto();
    });
  };

  return (
    <View style={styles.iconBlock}>
      <PressableScale onPress={onToggle} style={styles.iconHead} pressTint accessibilityLabel="更换类目图标">
        <IconFace icon={current} size={44} />
        <View style={styles.iconHeadText}>
          <Text style={styles.iconName}>{current.label}</Text>
          <Text style={styles.iconHint}>{auto ? '按名称自动匹配 · 点此更换' : '已手选 · 点此更换'}</Text>
        </View>
      </PressableScale>
      {open ? (
        <View style={styles.iconGridWrap}>
          <PressableScale onPress={onAuto} style={[styles.iconAuto, auto && styles.iconAutoOn]} pressTint>
            <Text style={[styles.iconAutoText, auto && styles.iconAutoTextOn]}>跟名称走</Text>
          </PressableScale>

          <View style={styles.iconGroup}>
            <Text style={styles.iconGroupLabel}>自定义  CUSTOM</Text>
            <View style={styles.iconGrid}>
              <PressableScale
                onPress={() => void upload()}
                style={[styles.iconCell, styles.iconCellUpload]}
                pressTint
                accessibilityLabel="上传自定义图标"
              >
                <Plus size={18} color={colors.dimInk} strokeWidth={1.8} />
              </PressableScale>
              {customs.map((uri) => {
                const key = customIconKey(uri);
                const on = current.id === key && !auto;
                return (
                  <PressableScale
                    key={uri}
                    onPress={() => onSelect(key)}
                    onLongPress={() => removeCustom(uri)}
                    style={[styles.iconCell, on && styles.iconCellOn]}
                    pressTint
                    accessibilityLabel="自定义图标"
                  >
                    <IconFace icon={customIconEntry(uri)} size={36} />
                  </PressableScale>
                );
              })}
            </View>
          </View>

          {ICON_GROUP_META.map((g) => (
            <View key={g.id} style={styles.iconGroup}>
              <Text style={styles.iconGroupLabel}>
                {g.cn}  {g.latin}
              </Text>
              <View style={styles.iconGrid}>
                {ICONS.filter((i) => i.group === g.id).map((i) => {
                  const on = current.id === i.id && !auto;
                  return (
                    <PressableScale
                      key={i.id}
                      onPress={() => onSelect(i.id)}
                      style={[styles.iconCell, on && styles.iconCellOn]}
                      pressTint
                      accessibilityLabel={i.label}
                    >
                      <IconFace icon={i} size={36} />
                    </PressableScale>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ChipRow<T extends string>({
  options,
  active,
  onSelect,
  labelOf,
}: {
  options: T[];
  active: T;
  onSelect: (value: T) => void;
  labelOf?: (value: T) => string;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.chips}>
      {options.map((opt) => {
        const on = opt === active;
        return (
          <PressableScale
            key={opt}
            onPress={() => onSelect(opt)}
            pressTint
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{labelOf ? labelOf(opt) : opt}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing(6),
    paddingBottom: spacing(10),
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing(1),
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  title: {
    fontFamily: fontFamily.sansBold,
    fontSize: 16,
    letterSpacing: 2,
    color: colors.ink,
  },
  field: {
    marginTop: spacing(4),
  },
  fieldLabel: {
    fontFamily: fontFamily.mono,
    fontSize: t.label,
    letterSpacing: 2,
    color: colors.dimInk,
    marginBottom: spacing(1.5),
  },
  input: {
    fontFamily: fontFamily.sans,
    fontSize: t.body,
    color: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.dash,
    minHeight: 44,
    paddingVertical: spacing(1.5),
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing(2),
  },
  currencyMark: {
    fontFamily: fontFamily.monoMed,
    fontSize: t.small,
    color: colors.dimInk,
  },
  amountInput: {
    flex: 1,
    fontFamily: fontFamily.monoMed,
    fontSize: 17,
    ...numerals,
  },
  hint: {
    fontFamily: fontFamily.mono,
    fontSize: t.tiny,
    color: colors.stamp,
    letterSpacing: 1,
    marginTop: spacing(1),
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.dash,
    borderRadius: radius.ring,
    paddingHorizontal: spacing(3.5),
    minHeight: 44,
    justifyContent: 'center',
  },
  chipOn: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  chipText: {
    fontFamily: fontFamily.mono,
    fontSize: t.small,
    color: colors.ink,
    letterSpacing: 0.5,
  },
  chipTextOn: {
    color: colors.onInk,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
  },
  photo: {
    width: 96,
    height: 96,
    borderRadius: radius.seal,
    backgroundColor: colors.paperHi,
  },
  photoEmpty: {
    width: 96,
    height: 96,
    borderRadius: radius.seal,
    borderWidth: 1,
    borderColor: colors.dash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoHint: {
    fontFamily: fontFamily.mono,
    fontSize: t.tiny,
    color: colors.dimInk,
  },
  photoBtns: {
    gap: spacing(2),
  },
  smallBtn: {
    minWidth: 44,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.dash,
    borderRadius: radius.ring,
    paddingHorizontal: spacing(3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBtnText: {
    fontFamily: fontFamily.mono,
    fontSize: t.small,
    color: colors.ink,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(2),
    marginTop: spacing(8),
    minHeight: 48,
    borderTopWidth: 1,
    borderTopColor: colors.dashSoft,
  },
  deleteText: {
    fontFamily: fontFamily.sansMed,
    fontSize: t.body,
    color: colors.stamp,
    letterSpacing: 1,
  },
  iconBlock: {
    marginTop: spacing(1),
  },
  iconHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    minHeight: 56,
  },
  iconHeadText: {
    flex: 1,
  },
  iconName: {
    fontFamily: fontFamily.sans,
    fontSize: t.body,
    color: colors.ink,
  },
  iconHint: {
    fontFamily: fontFamily.mono,
    fontSize: t.tiny,
    color: colors.dimInk,
    letterSpacing: 0.5,
    marginTop: spacing(0.5),
  },
  iconGridWrap: {
    marginTop: spacing(2),
    paddingTop: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.dashSoft,
  },
  iconAuto: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.dash,
    borderRadius: radius.ring,
    paddingHorizontal: spacing(3.5),
    minHeight: 36,
    justifyContent: 'center',
    marginBottom: spacing(2),
  },
  iconAutoOn: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  iconAutoText: {
    fontFamily: fontFamily.mono,
    fontSize: t.tiny,
    color: colors.ink,
    letterSpacing: 1,
  },
  iconAutoTextOn: {
    color: colors.onInk,
  },
  iconGroup: {
    marginBottom: spacing(2.5),
  },
  iconGroupLabel: {
    fontFamily: fontFamily.mono,
    fontSize: t.tiny,
    letterSpacing: 1,
    color: colors.dimInk,
    marginBottom: spacing(1),
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1.5),
  },
  iconCell: {
    padding: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  iconCellOn: {
    borderColor: colors.ink,
  },
  /** 上传格：虚线空章，与「被拖行留下的虚线空单」同一语言 */
  iconCellUpload: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.dash,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
