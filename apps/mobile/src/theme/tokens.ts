import { genz, type GenZPalette } from '@catalysis/ui-tokens';
import type { Tone } from '@catalysis/api';

export type { Tone };
export type Scheme = 'light' | 'dark';

/**
 * Colours that are the same in both themes: text on `solid` and on photographs,
 * and the translucent overlays the design writes out as rgba().
 */
export const fixed = {
  ...genz.fixed,
  white: '#FFFFFF',
  /** Text on a white chip ("Feast day", "CCC 2838"); white chips stay white in the dark theme. */
  onWhite: '#1B1F3B',
  /** Caps label on `solid` (the verse reference). */
  onSolidDim: '#A0A0AA',
  /** Outline of a pill drawn on `solid`. */
  onSolidLine: 'rgba(255,255,255,0.25)',
  /** Inactive tab icon on the tab bar. */
  onSolidIdle: 'rgba(255,255,255,0.7)',
  /** Backdrop behind a photograph while it loads. */
  photo: '#121212',
  /** Icon buttons and badges over photographs. */
  glass: 'rgba(0,0,0,0.4)',
  glassSoft: 'rgba(0,0,0,0.35)',
  glassStrong: 'rgba(0,0,0,0.45)',
  /** Light chip on an accent card ("Best 31"). */
  accentWash: 'rgba(255,255,255,0.55)',
  /** Recessed shape on an accent card (a day still to come). */
  accentShade: 'rgba(0,0,0,0.1)',
  /** Behind a bottom sheet. */
  backdrop: 'rgba(0,0,0,0.5)',
} as const;

export type ThemeColors = GenZPalette & typeof fixed;

export const palettes: Record<Scheme, ThemeColors> = {
  light: { ...genz.light, ...fixed },
  dark: { ...genz.dark, ...fixed },
};

/** Corner radii, from the handoff. */
export const radii = {
  /** Feature cards. The bento cards on Home are 26: pass `radius={26}`. */
  card: 28,
  /** Small cards, tiles in a grid. */
  cardSmall: 22,
  /** Inputs and list rows. */
  input: 18,
  /** Time tiles, small thumbnails. */
  tile: 16,
  pill: 999,
} as const;

export const layout = {
  /** Horizontal screen padding; Welcome and Login use the wide one. */
  screen: 20,
  screenWide: 24,
  /** Gap between cards. */
  gap: 10,
  /** Smallest tappable target. */
  hitTarget: 44,
} as const;

/** The floating tab bar. */
export const tabBar = {
  height: 64,
  /** Distance from the screen's sides. */
  side: 16,
  /** Distance above the bottom safe-area inset. */
  bottom: 20,
  /** Padding inside the pill. */
  padding: 8,
  /** Inactive item. */
  item: 48,
} as const;

/**
 * Space a screen leaves under its content so nothing hides behind the tab bar:
 * bar height + its offset + 16 of air. Add the bottom safe-area inset, or use `useTabBarSpace()`.
 */
export const TAB_BAR_SPACE = tabBar.height + tabBar.bottom + 16;

/** Shadows are for floating things only: the tab bar, stickers, toolbars, the FAB. */
export const shadows = {
  tabBar: '0 12px 30px rgba(0,0,0,0.25)',
  floating: '0 12px 28px rgba(0,0,0,0.25)',
  fab: '0 10px 22px rgba(0,0,0,0.25)',
  sticker: '0 12px 26px rgba(0,0,0,0.14)',
  photo: '0 16px 30px rgba(0,0,0,0.2)',
  segment: '0 2px 8px rgba(0,0,0,0.08)',
} as const;

/** In a desktop browser the app keeps to a phone-width column, and sheets keep to it too. */
export const WEB_FRAME_WIDTH = 430;

/** Every tappable target is at least 44pt; small text actions reach it with this. */
export const HIT_SLOP = { top: 14, bottom: 14, left: 10, right: 10 } as const;

/** Lucide stroke width. */
export const ICON_STROKE = 2;
