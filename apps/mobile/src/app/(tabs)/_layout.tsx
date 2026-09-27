import { Tabs } from 'expo-router/js-tabs';

import { TabBar, type TabKey } from '@/components/ui';
import { useTheme } from '@/theme';

/**
 * Discover is drawn with the tab bar but is not a tab itself, so it lives here
 * as a hidden route and lights up the tab it belongs to.
 */
const ROUTE_TAB: Record<string, TabKey> = {
  today: 'today',
  scripture: 'scripture',
  prayer: 'prayer',
  community: 'community',
  reels: 'reels',
  discover: 'reels',
};

/**
 * Events is a pushed screen in the new design: it keeps its place among these
 * routes so links to `/events` still work, but the tab bar is hidden on it.
 */
const WITHOUT_TAB_BAR = new Set(['events']);

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      backBehavior="history"
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
      tabBar={({ state, navigation }) => {
        const focused = state.routes[state.index];
        const name = focused?.name ?? 'today';
        if (WITHOUT_TAB_BAR.has(name)) return null;
        return (
          <TabBar
            active={ROUTE_TAB[name] ?? 'today'}
            onSelect={(key) => {
              const target = state.routes.find((route) => route.name === key);
              if (!target) return;
              const event = navigation.emit({ type: 'tabPress', target: target.key, canPreventDefault: true });
              if (!event.defaultPrevented && focused?.key !== target.key) navigation.navigate(target.name, target.params);
            }}
          />
        );
      }}>
      <Tabs.Screen name="today" />
      <Tabs.Screen name="scripture" />
      <Tabs.Screen name="prayer" />
      <Tabs.Screen name="community" />
      <Tabs.Screen name="reels" />
      <Tabs.Screen name="events" options={{ href: null }} />
      <Tabs.Screen name="discover" options={{ href: null }} />
    </Tabs>
  );
}
