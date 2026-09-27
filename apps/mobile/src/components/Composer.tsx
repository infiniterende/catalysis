// LEGACY (editorial) component, kept so screens that are not restyled yet still compile.
// New code uses the kit in '@/components/ui' (see KIT.md). Deleted once nothing imports it.
import { StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, text } from '@/theme';

import { Icon } from './Icon';
import { Touchable } from './Touchable';

interface ComposerProps {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  placeholder: string;
  /** Blocks sending, e.g. while an answer is streaming. */
  busy?: boolean;
  sendLabel?: string;
}

/** Pinned input bar: ink top rule, italic placeholder, black square send button. */
export function Composer({ value, onChangeText, onSend, placeholder, busy = false, sendLabel = 'Send' }: ComposerProps) {
  const insets = useSafeAreaInsets();
  const disabled = busy || value.trim().length === 0;
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) + 14 }]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.subtle}
        selectionColor={colors.crimson}
        accessibilityLabel={placeholder}
        multiline
        submitBehavior="submit"
        returnKeyType="send"
        onSubmitEditing={disabled ? undefined : onSend}
        // Caslon italic for the placeholder, upright once there is text.
        style={[styles.input, value.length === 0 ? styles.placeholder : null]}
      />
      <Touchable
        onPress={onSend}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={sendLabel}
        accessibilityState={{ disabled, busy }}
        style={[styles.send, disabled && styles.sendDisabled]}>
        <Icon name="arrow-up" size={18} color={colors.white} />
      </Touchable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 14,
    paddingHorizontal: 20,
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: colors.ink,
  },
  input: {
    ...text(15, { lineHeight: 1.4 }),
    flex: 1,
    color: colors.ink,
    maxHeight: 110,
    paddingVertical: 8,
    paddingHorizontal: 0,
    outlineWidth: 0,
  },
  placeholder: { ...text(15, { italic: true, lineHeight: 1.4 }) },
  send: { width: 40, height: 40, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { backgroundColor: colors.rule },
});
