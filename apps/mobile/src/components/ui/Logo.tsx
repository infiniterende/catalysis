import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { display, useStyles, useTheme, type ThemeColors } from '@/theme';

import { Icon } from './Icon';

export interface LogoProps {
  /** Side of the mark; the wordmark scales with it. */
  size?: number;
  /** The mark alone, without "catalysis". */
  markOnly?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** The app mark (flame on `logoBg`) and the lowercase wordmark. */
export function Logo({ size = 34, markOnly = false, style }: LogoProps) {
  const { colors } = useTheme();
  const styles = useStyles(themed);
  return (
    <View accessible accessibilityRole="header" accessibilityLabel="Catalysis" style={[styles.row, style]}>
      <View style={[styles.mark, { width: size, height: size, borderRadius: Math.round(size * 0.32) }]}>
        <Icon name="flame" size={Math.round(size * 0.53)} color={colors.logoIc} />
      </View>
      {markOnly ? null : (
        <Text style={[styles.word, display(Math.round(size * 0.65), 'bold', { tracking: -0.035 })]}>catalysis</Text>
      )}
    </View>
  );
}

const themed = (c: ThemeColors) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    mark: { backgroundColor: c.logoBg, alignItems: 'center', justifyContent: 'center' },
    word: { color: c.ink },
  });
