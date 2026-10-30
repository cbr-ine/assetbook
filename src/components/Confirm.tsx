import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { fontFamily, motion, radius, spacing, type as t, type Palette } from '../theme';
import { useThemedStyles } from '../state/ThemeContext';
import { PressableScale } from './Motion';
import { DashedRule } from './Rule';

/**
 * 自绘确认框：替代系统 Alert，专承接「删除 / 清空」这类破坏性动作。
 * 视觉与吐司同一语言 —— 纱幕上一张略亮的纸，标题下一条分段虚线，
 * 底部两枚并排键：取消描边、确认实心（危险动作盖验讫章红）。
 * 用法：const { confirm } = useConfirm(); await confirm({...}) → boolean。
 */

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** 确认键文案，默认「确定」 */
  confirmText?: string;
  /** 取消键文案，默认「取消」 */
  cancelText?: string;
  /** 危险动作：确认键盖红章 */
  destructive?: boolean;
}

interface Req {
  opts: ConfirmOptions;
  resolve: (ok: boolean) => void;
}

const Ctx = React.createContext<{ confirm: (opts: ConfirmOptions) => Promise<boolean> }>({
  confirm: () => Promise.resolve(false),
});

export function useConfirm() {
  return React.useContext(Ctx);
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(createStyles);
  const [req, setReq] = useState<Req | null>(null);
  // 纱幕淡出播完才卸载 Modal，避免最后一帧闪空
  const [mounted, setMounted] = useState(false);
  const prog = useRef(new Animated.Value(0)).current;
  const reqRef = useRef<Req | null>(null);
  reqRef.current = req;

  const confirm = useCallback(
    (opts: ConfirmOptions) => new Promise<boolean>((resolve) => setReq({ opts, resolve })),
    [],
  );

  useEffect(() => {
    if (!req) return;
    setMounted(true);
    prog.setValue(0);
    Animated.timing(prog, {
      toValue: 1,
      duration: motion.base,
      easing: motion.easing,
      useNativeDriver: true,
    }).start();
  }, [req, prog]);

  const settle = useCallback(
    (ok: boolean) => {
      const r = reqRef.current;
      if (!r) return;
      reqRef.current = null;
      setReq(null);
      Animated.timing(prog, {
        toValue: 0,
        duration: motion.fast,
        easing: motion.easing,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
      // 选中即回话，删除不等退场动画（与系统 Alert 同步感一致）
      r.resolve(ok);
    },
    [prog],
  );

  const value = React.useMemo(() => ({ confirm }), [confirm]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {mounted ? (
        <Modal visible transparent animationType="none" onRequestClose={() => settle(false)}>
          <View style={styles.host}>
            <Animated.View style={[styles.scrim, { opacity: prog }]}>
              <Pressable style={StyleSheet.absoluteFill} onPress={() => settle(false)} accessibilityLabel="取消" />
            </Animated.View>
            <Animated.View
              style={[
                styles.panel,
                {
                  opacity: prog,
                  transform: [{ scale: prog.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
                },
              ]}
            >
              <Text style={styles.title}>{req?.opts.title}</Text>
              <DashedRule style={styles.rule} />
              {req?.opts.message ? <Text style={styles.msg}>{req.opts.message}</Text> : null}
              <View style={styles.btns}>
                <PressableScale
                  style={styles.btnCancel}
                  onPress={() => settle(false)}
                  pressOpacity={0.85}
                  accessibilityLabel={req?.opts.cancelText ?? '取消'}
                >
                  <Text style={styles.cancelText}>{req?.opts.cancelText ?? '取消'}</Text>
                </PressableScale>
                <PressableScale
                  style={[styles.btnOk, req?.opts.destructive && styles.btnDanger]}
                  onPress={() => settle(true)}
                  pressOpacity={0.85}
                  accessibilityLabel={req?.opts.confirmText ?? '确定'}
                >
                  <Text style={[styles.okText, req?.opts.destructive && styles.dangerText]}>
                    {req?.opts.confirmText ?? '确定'}
                  </Text>
                </PressableScale>
              </View>
            </Animated.View>
          </View>
        </Modal>
      ) : null}
    </Ctx.Provider>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
  host: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrim,
  },
  panel: {
    width: '78%',
    maxWidth: 320,
    backgroundColor: colors.paperHi,
    borderWidth: 1,
    borderColor: colors.dash,
    borderRadius: radius.seal,
    paddingHorizontal: spacing(5),
    paddingTop: spacing(5),
    paddingBottom: spacing(4),
  },
  title: {
    fontFamily: fontFamily.sansBold,
    fontSize: 15.5,
    letterSpacing: 2,
    color: colors.ink,
    textAlign: 'center',
  },
  rule: {
    marginVertical: spacing(3),
  },
  msg: {
    fontFamily: fontFamily.sans,
    fontSize: t.body,
    lineHeight: t.body * 1.7,
    color: colors.dimInk,
    textAlign: 'center',
  },
  btns: {
    flexDirection: 'row',
    gap: spacing(3),
    marginTop: spacing(5),
  },
  btnCancel: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.dash,
    borderRadius: radius.seal,
  },
  cancelText: {
    fontFamily: fontFamily.sansMed,
    fontSize: 14,
    letterSpacing: 2,
    color: colors.ink,
  },
  btnOk: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
    borderRadius: radius.seal,
  },
  okText: {
    fontFamily: fontFamily.sansMed,
    fontSize: 14,
    letterSpacing: 2,
    color: colors.onInk,
  },
  btnDanger: {
    backgroundColor: colors.stamp,
  },
  dangerText: {
    color: colors.paper,
  },
});
