// LEGACY (editorial) component, kept so screens that are not restyled yet still compile.
// New code uses the kit in '@/components/ui' (see KIT.md). Deleted once nothing imports it.
import type { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { colors, sans, text } from '@/theme';

import { Label } from './Label';

interface FieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  /** Sits at the right of the input, inside the underline ("Show"). */
  accessory?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Underline-only input with a caps label above and a crimson error below. */
export function Field({ label, error, accessory, style, ...input }: FieldProps) {
  return (
    <View style={style}>
      <Label color={colors.muted}>{label}</Label>
      <View style={[styles.line, error ? styles.lineError : null]}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.subtle}
          selectionColor={colors.crimson}
          {...input}
          style={[styles.input, input.multiline ? styles.multiline : null]}
        />
        {accessory}
      </View>
      {error ? <FieldError>{error}</FieldError> : null}
    </View>
  );
}

export function FieldError({ children, style }: { children: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Text style={styles.error}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.ink,
  },
  lineError: { borderBottomColor: colors.crimson },
  input: {
    ...text(17),
    flex: 1,
    color: colors.ink,
    paddingVertical: 10,
    paddingHorizontal: 0,
    // react-native-web draws a focus ring around inputs; the underline is the focus cue here.
    outlineWidth: 0,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  error: { ...sans(11, 'medium'), color: colors.crimson, marginTop: 6 },
});
