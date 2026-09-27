import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { body, radii, shadows, tabBar, useStyles, useTheme, type ThemeColors } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Touchable } from './Touchable';

export { TAB_BAR_SPACE } from '@/theme';

export type TabKey = 'today' | 'scripture' | 'prayer' | 'community' | 'reels';

/** Keys are the route names, which have not changed; only labels and icons have. */
export const TABS: readonly { key: TabKey; label: string; icon: IconName }[] = [
  { key: 'today', label: 'Home', icon: 'house' },
  { key: 'scripture', label: 'Bible', icon: 'book-open' },
  { key: 'prayer', label: 'Prayer', icon: 'flame' },
  { key: 'community', label: 'Community', icon: 'users' },
  { key: 'reels', label: 'Reels', icon: 'clapperboard' },
];

export interface TabBarProps {
  active: TabKey;
  onSelect: (key: TabKey) => void;
}

/**
 * The floating tab bar: a `solid` pill over the content, 16 from the sides and
 * 20 above the bottom inset. It takes no space in the layout; screens leave
 * `TAB_BAR_SPACE` + the bottom inset under their content (`useTabBarSpace()`).
 */
export function TabBar({ active, onSelect }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles(themed);

  return (
    <View pointerEvents="box-none" style={[styles.dock, { bottom: insets.bottom + tabBar.bottom }]}>
      <View accessibilityRole="tablist" style={styles.bar}>
        {TABS.map((tab) => {
          const selected = tab.key === active;
          return (
            <Touchable
              key={tab.key}
              onPress={() => onSelect(tab.key)}
              hitSlop={{ top: 8, bottom: 8 }}
              pressedOpacity={0.8}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected }}
              style={selected ? styles.active : styles.item}>
              <Icon
                name={tab.icon}
                size={selected ? 19 : 21}
                color={selected ? colors.onA : colors.onSolidIdle}
              />
              {selected ? <Text numberOfLines={1} style={styles.label}>{tab.label}</Text> : null}
            </Touchable>
          );
        })}
      </View>
    </View>
  );
}

const themed = (c: ThemeColors) =>
  StyleSheet.create({
    dock: {
      position: 'absolute',
      left: 0,
      right: 0,
      paddingHorizontal: tabBar.side,
      alignItems: 'center',
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      alignSelf: 'stretch',
      height: tabBar.height,
      paddingHorizontal: tabBar.padding,
      borderRadius: radii.pill,
      backgroundColor: c.solid,
      boxShadow: shadows.tabBar,
    },
    item: { width: tabBar.item, height: tabBar.item, alignItems: 'center', justifyContent: 'center' },
    active: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: radii.pill,
      backgroundColor: c.a2,
    },
    label: { ...body(14, 'bold', { lineHeight: 1.3 }), color: c.onA },
  });
