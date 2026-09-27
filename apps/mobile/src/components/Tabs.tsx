// LEGACY (editorial) component, kept so screens that are not restyled yet still compile.
// New code uses the kit in '@/components/ui' (see KIT.md). Deleted once nothing imports it.
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, onDark } from '@/theme';

import { Label } from './Label';
import { Touchable } from './Touchable';

export interface TabItem<K extends string> {
  key: K;
  label: string;
}

type Variant =
  /** Content tabs on paper: 2px crimson underline, ink baseline. */
  | 'content'
  /** Log in / Sign up: 1.5px ink underline, `rule` baseline. */
  | 'form'
  /** Over media on Reels: white, centred, no baseline. */
  | 'overlay'
  /** Create Post modes on black: crimson underline, centred, no baseline. */
  | 'mode';

const VARIANTS: Record<Variant, {
  active: string; inactive: string; underline: string; thickness: number;
  baseline: string | null; padBottom: number; activeWeight: 'semibold' | 'bold'; centered: boolean;
}> = {
  content: { active: colors.ink, inactive: colors.subtle, underline: colors.crimson, thickness: 2, baseline: colors.ink, padBottom: 11, activeWeight: 'semibold', centered: false },
  form: { active: colors.ink, inactive: colors.subtle, underline: colors.ink, thickness: 1.5, baseline: colors.rule, padBottom: 11, activeWeight: 'semibold', centered: false },
  overlay: { active: colors.white, inactive: onDark.inactive, underline: colors.white, thickness: 2, baseline: null, padBottom: 7, activeWeight: 'bold', centered: true },
  mode: { active: colors.white, inactive: colors.subtle, underline: colors.crimson, thickness: 1.5, baseline: null, padBottom: 6, activeWeight: 'bold', centered: true },
};

interface TabsProps<K extends string> {
  tabs: readonly TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  variant?: Variant;
  gap?: number;
  padH?: number;
  style?: StyleProp<ViewStyle>;
}

/** Underlined caps tabs. */
export function Tabs<K extends string>({ tabs, value, onChange, variant = 'content', gap = 22, padH = 0, style }: TabsProps<K>) {
  const v = VARIANTS[variant];
  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.row,
        { gap, paddingHorizontal: padH },
        v.centered && styles.centered,
        v.baseline ? { borderBottomWidth: 1, borderBottomColor: v.baseline } : null,
        style,
      ]}>
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <Touchable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: active }}
            style={[
              { paddingBottom: v.padBottom, borderBottomWidth: v.thickness, borderBottomColor: active ? v.underline : 'transparent' },
              // The underline sits on top of the baseline rule rather than above it.
              v.baseline ? styles.overlap : null,
            ]}>
            <Label weight={active ? v.activeWeight : 'medium'} color={active ? v.active : v.inactive}>{tab.label}</Label>
          </Touchable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  centered: { justifyContent: 'center' },
  overlap: { marginBottom: -1 },
});
