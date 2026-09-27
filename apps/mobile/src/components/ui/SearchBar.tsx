import { StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { body, radii, useStyles, useTheme, type ThemeColors } from '@/theme';

import { Icon } from './Icon';
import { Touchable } from './Touchable';
import { usePress, type PressTarget } from './usePress';

export interface SearchBarProps extends Omit<TextInputProps, 'style' | 'onPress'>, PressTarget {
  placeholder: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Pill-shaped search field. With `onPress` / `href` it is a button that looks
 * like the field and opens the search screen.
 */
export function SearchBar({ placeholder, onPress, href, style, ...input }: SearchBarProps) {
  const { colors, scheme } = useTheme();
  const styles = useStyles(themed);
  const { press, role } = usePress({ onPress, href });

  if (press) {
    return (
      <Touchable
        onPress={press}
        hitSlop={undefined}
        pressedOpacity={0.8}
        accessibilityRole={role}
        accessibilityLabel="Search"
        style={[styles.bar, style]}>
        <Icon name="search" size={16} color={colors.subtle} />
        <Text numberOfLines={1} style={styles.placeholder}>{placeholder}</Text>
      </Touchable>
    );
  }
  return (
    <View style={[styles.bar, style]}>
      <Icon name="search" size={16} color={colors.subtle} />
      <TextInput
        accessibilityLabel="Search"
        placeholder={placeholder}
        placeholderTextColor={colors.subtle}
        selectionColor={colors.a1}
        cursorColor={colors.a1}
        keyboardAppearance={scheme}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        {...input}
        style={styles.input}
      />
    </View>
  );
}

const themed = (c: ThemeColors) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.inset,
      borderRadius: radii.pill,
      paddingVertical: 13,
      paddingHorizontal: 16,
    },
    placeholder: { ...body(15), color: c.subtle, flex: 1 },
    input: { ...body(15), flex: 1, color: c.ink, padding: 0, minHeight: 20, outlineWidth: 0 },
  });
