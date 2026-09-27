import { useState, type ReactNode } from 'react';
import {
  StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle,
} from 'react-native';

import { body, caps, radii, useStyles, useTheme, type ThemeColors } from '@/theme';

import { Icon, type IconName } from './Icon';

export interface FieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  /** `caps` is the kit's label; `plain` is the sentence-case label drawn on Login. */
  labelStyle?: 'caps' | 'plain';
  /** Keeps the label for screen readers only. */
  hideLabel?: boolean;
  error?: string;
  /** Leading icon, in `subtle`. */
  icon?: IconName;
  /** Sits at the right, inside the field (show / hide password). */
  accessory?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Filled input, radius 18. Focus is a 2px `a1` border. */
export function Field({
  label, labelStyle = 'caps', hideLabel = false, error, icon, accessory, style, onFocus, onBlur, ...input
}: FieldProps) {
  const { colors, scheme } = useTheme();
  const styles = useStyles(themed);
  const [focused, setFocused] = useState(false);

  return (
    <View style={style}>
      {hideLabel ? null : (
        <Text style={labelStyle === 'caps' ? styles.labelCaps : styles.labelPlain}>{label}</Text>
      )}
      <View style={[styles.box, (focused || Boolean(error)) && styles.boxFocused, input.multiline && styles.boxMultiline]}>
        {icon ? <Icon name={icon} size={16} color={colors.subtle} /> : null}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.subtle}
          selectionColor={colors.a1}
          cursorColor={colors.a1}
          keyboardAppearance={scheme}
          {...input}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[styles.input, input.multiline && styles.multiline]}
        />
        {accessory}
      </View>
      {error ? <FieldError>{error}</FieldError> : null}
    </View>
  );
}

export interface FieldErrorProps {
  children: string;
  style?: StyleProp<ViewStyle>;
}

/** The line under a field, or a form-level error. Announced when it appears. */
export function FieldError({ children, style }: FieldErrorProps) {
  const { colors } = useTheme();
  const styles = useStyles(themed);
  return (
    <View style={[styles.error, style]} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Icon name="x" size={13} color={colors.a1} />
      <Text style={styles.errorText}>{children}</Text>
    </View>
  );
}

const themed = (c: ThemeColors) =>
  StyleSheet.create({
    labelCaps: { ...caps(11), color: c.muted, marginBottom: 8, marginLeft: 4 },
    labelPlain: { ...body(13, 'semibold'), color: c.muted, marginBottom: 8, marginLeft: 4 },
    // The border is always there, so the field does not shift when it takes focus.
    box: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.inset,
      borderRadius: radii.input,
      borderWidth: 2,
      borderColor: 'transparent',
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    boxFocused: { borderColor: c.a1 },
    boxMultiline: { alignItems: 'flex-start' },
    input: {
      ...body(15),
      flex: 1,
      color: c.ink,
      padding: 0,
      minHeight: 22,
      // react-native-web draws a focus ring around inputs; the border is the focus cue here.
      outlineWidth: 0,
    },
    multiline: { minHeight: 96, textAlignVertical: 'top' },
    error: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginLeft: 4 },
    errorText: { ...body(13, 'semibold'), color: c.ink, flex: 1 },
  });
