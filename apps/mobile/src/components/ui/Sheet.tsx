import { createContext, use, type ReactNode } from 'react';
import {
  KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { body, display, radii, useStyles, useTheme, WEB_FRAME_WIDTH, type ThemeColors } from '@/theme';

import { Icon, type IconName } from './Icon';
import { IconButton } from './IconButton';
import { Touchable } from './Touchable';

/** iOS cannot present a share sheet or alert while this modal is still sliding away. */
const DISMISS_MS = 350;

const SheetContext = createContext<(() => void) | null>(null);

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Muted line under the title. */
  message?: string;
  children: ReactNode;
  /** Long content scrolls inside the sheet, which never exceeds 85% of the screen. */
  scroll?: boolean;
}

/** Bottom sheet: `card` surface, 28 radius top corners, grabber; closed by the backdrop or the button. */
export function Sheet({ visible, onClose, title, message, children, scroll = false }: SheetProps) {
  const insets = useSafeAreaInsets();
  const styles = useStyles(themed);
  const content = <View style={styles.body}>{children}</View>;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <View accessibilityViewIsModal style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 14 }]}>
          <View style={styles.grabber} />
          <View style={styles.header}>
            <View style={styles.titles}>
              {title ? <Text accessibilityRole="header" style={styles.title}>{title}</Text> : null}
              {message ? <Text style={styles.message}>{message}</Text> : null}
            </View>
            <IconButton name="x" label="Close" size={36} iconSize={17} onPress={onClose} />
          </View>
          <SheetContext value={onClose}>
            {scroll ? (
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {content}
              </ScrollView>
            ) : content}
          </SheetContext>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export interface SheetActionProps {
  label: string;
  onPress: () => void;
  icon?: IconName;
  /** Second line, in `muted`. */
  detail?: string;
  /** Report, block, delete: set in `a1`. */
  destructive?: boolean;
  /** Set for a choice in a list of options; shows a check. */
  selected?: boolean;
  /** Closes the sheet first, then runs `onPress` once it has gone. On by default. */
  closes?: boolean;
}

/** A row in a sheet. Inside a `Sheet` it closes the sheet before acting. */
export function SheetAction({
  label, onPress, icon, detail, destructive = false, selected, closes = true,
}: SheetActionProps) {
  const { colors } = useTheme();
  const styles = useStyles(themed);
  const close = use(SheetContext);
  const ink = destructive ? colors.a1 : colors.ink;

  const press = () => {
    if (!closes || !close) {
      onPress();
      return;
    }
    close();
    if (Platform.OS === 'ios') setTimeout(onPress, DISMISS_MS);
    else onPress();
  };

  return (
    <Touchable
      onPress={press}
      hitSlop={undefined}
      pressedOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={detail}
      accessibilityState={selected === undefined ? undefined : { selected }}
      style={styles.action}>
      {icon ? <Icon name={icon} size={19} color={ink} /> : null}
      <View style={styles.actionText}>
        <Text style={[styles.actionLabel, { color: ink }]}>{label}</Text>
        {detail ? <Text style={styles.actionDetail}>{detail}</Text> : null}
      </View>
      {selected ? <Icon name="check" size={18} color={colors.ink} /> : null}
    </Touchable>
  );
}

export interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  actions: SheetActionProps[];
}

/** A sheet that is only a list of actions (post options, report / block). */
export function ActionSheet({ visible, onClose, title, message, actions }: ActionSheetProps) {
  const styles = useStyles(themed);
  return (
    <Sheet visible={visible} onClose={onClose} title={title} message={message}>
      <View style={styles.actions}>
        {actions.map((action) => <SheetAction key={action.label} {...action} />)}
      </View>
    </Sheet>
  );
}

const themed = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: c.backdrop },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: radii.card,
      borderTopRightRadius: radii.card,
      paddingTop: 10,
      paddingHorizontal: 20,
      maxHeight: '85%',
      // On a wide browser window the sheet keeps to the phone column.
      width: '100%',
      maxWidth: WEB_FRAME_WIDTH,
      alignSelf: 'center',
    },
    grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: c.line },
    header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingTop: 14, paddingBottom: 14 },
    titles: { flex: 1, minHeight: 36, justifyContent: 'center' },
    title: { ...display(22, 'bold', { tracking: -0.02, lineHeight: 1.15 }), color: c.ink },
    message: { ...body(14, 'regular', { lineHeight: 1.5 }), color: c.muted, marginTop: 4 },
    body: { paddingBottom: 4 },
    actions: { gap: 8 },
    action: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 52,
      backgroundColor: c.inset,
      borderRadius: radii.input,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    actionText: { flex: 1 },
    actionLabel: { ...body(15, 'semibold') },
    actionDetail: { ...body(13), color: c.muted, marginTop: 2 },
  });
