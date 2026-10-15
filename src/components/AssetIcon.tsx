import React, { memo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import {
  Aperture,
  Bike,
  BookOpen,
  Bot,
  Camera,
  CarFront,
  CircleParking,
  Coins,
  Drone,
  Drum,
  Gamepad2,
  Gem,
  Glasses,
  Guitar,
  Headphones,
  House,
  Keyboard,
  KeyboardMusic,
  Laptop,
  MicVocal,
  Motorbike,
  Music,
  Pencil,
  Piano,
  Projector,
  Refrigerator,
  ShoppingBag,
  Smartphone,
  Sofa,
  Speaker,
  Tablet,
  TvMinimal,
  Watch,
  type LucideIcon,
} from 'lucide-react-native';

import { resolveIcon, type IconEntry } from '../data/icons';
import { currencySymbol } from '../data/currencies';
import { colors, fontFamily } from '../theme';

const LUCIDE: Record<string, LucideIcon> = {
  House,
  CarFront,
  CircleParking,
  TvMinimal,
  Refrigerator,
  Sofa,
  Bot,
  Laptop,
  Smartphone,
  Tablet,
  Camera,
  Aperture,
  Drone,
  Gamepad2,
  Pencil,
  Headphones,
  Watch,
  Keyboard,
  BookOpen,
  Speaker,
  Projector,
  Glasses,
  Motorbike,
  Bike,
  ShoppingBag,
  Gem,
  Coins,
  Guitar,
  Piano,
  KeyboardMusic,
  Drum,
  MicVocal,
  Music,
};

interface Props {
  name: string;
  type: string;
  currency: string;
  iconKey?: string | null;
  size?: number;
}

/**
 * 资产行左侧的类目图：品牌位图 / 钞票块 / lucide 墨线，三套共用同一外框。
 * 尺寸默认 36，列表与编辑器共用。
 */
export const AssetIcon = memo(function AssetIcon({ name, type, currency, iconKey, size = 36 }: Props) {
  const icon = resolveIcon({ name, type, currency, iconKey });
  return <IconFace icon={icon} size={size} />;
});

export function IconFace({ icon, size }: { icon: IconEntry; size: number }) {
  const r = Math.max(6, Math.round(size * 0.22));
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: r }]}>
      {icon.kind === 'brand' && icon.source != null ? (
        <Image source={icon.source} style={{ width: size, height: size, borderRadius: r }} />
      ) : icon.kind === 'note' ? (
        <NoteFace icon={icon} size={size} />
      ) : (
        <LineFace icon={icon} size={size} />
      )}
    </View>
  );
}

function NoteFace({ icon, size }: { icon: IconEntry; size: number }) {
  const color = icon.color ?? colors.ink;
  const bw = Math.round(size * 0.78);
  const bh = Math.round(size * 0.52);
  const code = icon.code ?? 'CNY';
  const raw = currencySymbol(code).trim() || code;
  const n = raw.length;
  const fontSize = n === 1 ? Math.round(size * 0.34) : n <= 3 ? Math.round(size * 0.22) : Math.round(size * 0.16);
  return (
    <View
      style={[
        styles.note,
        {
          width: bw,
          height: bh,
          borderColor: color,
          backgroundColor: color + '22',
          borderRadius: Math.max(3, Math.round(size * 0.08)),
        },
      ]}
    >
      <Text style={[styles.noteSym, { color, fontSize }]} numberOfLines={1}>
        {raw}
      </Text>
    </View>
  );
}

function LineFace({ icon, size }: { icon: IconEntry; size: number }) {
  const Glyph = (icon.lucide && LUCIDE[icon.lucide]) || House;
  return <Glyph size={Math.round(size * 0.58)} color={colors.ink} strokeWidth={1.8} />;
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.paperHi,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dashSoft,
  },
  note: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteSym: {
    fontFamily: fontFamily.monoSemi,
    letterSpacing: -0.4,
  },
});
