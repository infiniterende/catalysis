// LEGACY (editorial) component, kept so screens that are not restyled yet still compile.
// New code uses the kit in '@/components/ui' (see KIT.md). Deleted once nothing imports it.
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, onDark, text, WEB_FRAME_WIDTH } from '@/theme';

import { Label } from './Label';
import { Touchable } from './Touchable';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  tone?: 'light' | 'dark';
  /** Long content scrolls inside the sheet, which never exceeds 80% of the screen. */
  scroll?: boolean;
}

/** Bottom sheet: square, ruled at the top, dismissed by the backdrop or "Close". */
export function Sheet({ visible, onClose, title, children, tone = 'light', scroll = false }: SheetProps) {
  const insets = useSafeAreaInsets();
  const dark = tone === 'dark';
  const ink = dark ? colors.white : colors.ink;
  const body = <View style={styles.body}>{children}</View>;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: dark ? colors.sheet : colors.paper,
              borderTopColor: dark ? onDark.ruleSheet : colors.ink,
              paddingBottom: Math.max(insets.bottom, 12) + 14,
            },
          ]}>
          <View style={styles.header}>
            <Label weight="semibold" color={ink} accessibilityRole="header">{title ?? ''}</Label>
            <Touchable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
              <Label size={9} color={dark ? colors.onDarkMuted : colors.muted}>Close</Label>
            </Touchable>
          </View>
          {scroll ? (
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{body}</ScrollView>
          ) : body}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const DISMISS_MS = 350;

export interface SheetAction {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Caslon italic line under the title. */
  message?: string;
  actions: SheetAction[];
  tone?: 'light' | 'dark';
}

/** A sheet of caps actions, one per ruled row. */
export function ActionSheet({ visible, onClose, title, message, actions, tone = 'light' }: ActionSheetProps) {
  const dark = tone === 'dark';
  return (
    <Sheet visible={visible} onClose={onClose} title={title} tone={tone}>
      {message ? (
        <Text style={[styles.message, { color: dark ? colors.onDarkMuted : colors.muted }]}>{message}</Text>
      ) : null}
      <View style={[styles.actions, { borderTopColor: dark ? onDark.rule : colors.ink }]}>
        {actions.map((action) => (
          <Touchable
            key={action.label}
            hitSlop={undefined}
            onPress={() => {
              onClose();
              // iOS cannot present a share sheet or alert while this modal is still
              // sliding away, so the action waits for the dismissal to finish.
              if (Platform.OS === 'ios') setTimeout(action.onPress, DISMISS_MS);
              else action.onPress();
            }}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            style={[styles.action, { borderBottomColor: dark ? onDark.ruleSoft : colors.rule }]}>
            <Label color={action.destructive ? (dark ? colors.crimsonOnDark : colors.crimson) : dark ? colors.white : colors.ink}>
              {action.label}
            </Label>
          </Touchable>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(11,11,11,0.5)' },
  sheet: {
    borderTopWidth: 1,
    paddingTop: 18,
    paddingHorizontal: 22,
    maxHeight: '80%',
    // On a wide browser window the sheet keeps to the phone column.
    width: '100%',
    maxWidth: WEB_FRAME_WIDTH,
    alignSelf: 'center',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14 },
  body: { paddingBottom: 4 },
  message: { ...text(14, { italic: true, lineHeight: 1.5 }), paddingBottom: 14 },
  actions: { borderTopWidth: 1 },
  action: { paddingVertical: 16, borderBottomWidth: 1 },
});
