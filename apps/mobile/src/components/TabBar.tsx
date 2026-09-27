// LEGACY path, kept so old imports still resolve. The tab bar is the kit's floating bar;
// import it from '@/components/ui'. Deleted once nothing imports this file.
import { TabBar as FloatingTabBar, type TabBarProps as FloatingTabBarProps } from './ui/TabBar';

export type { TabKey } from './ui/TabBar';

interface TabBarProps extends FloatingTabBarProps {
  /** @deprecated The bar is `solid` on every screen and follows the theme; this has no effect. */
  dark?: boolean;
}

export function TabBar({ active, onSelect }: TabBarProps) {
  return <FloatingTabBar active={active} onSelect={onSelect} />;
}
