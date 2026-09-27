/**
 * The Gen Z theme. Colours come from `useTheme()` / `useStyles()`; type from
 * `display` / `body` / `scripture` / `caps`; shapes from `radii` / `layout`.
 */
export { ThemeProvider, useStyles, useTheme, type StyleFactory, type Theme } from './ThemeProvider';
export {
  fixed, HIT_SLOP, ICON_STROKE, layout, palettes, radii, shadows, tabBar, TAB_BAR_SPACE, WEB_FRAME_WIDTH,
  type Scheme, type ThemeColors, type Tone,
} from './tokens';
export {
  body, caps, families, scripture,
  type BodyWeight, type DisplayWeight, type ScriptureWeight, type TypeOptions,
} from './type';
export { isTone, onSurface, surfaceColor, toneColor, toneFor, TONES, type Surface } from './tone';
export type { Appearance } from '@/lib/appearance';

// ---------------------------------------------------------------------------
// Legacy shims for the screens not yet restyled. Deleted with ./legacy.ts, at
// which point `display` is exported from './type' instead.
// ---------------------------------------------------------------------------
export {
  colors, display, displayFamily, fonts, label, onDark, sans, spacing, text, tracking, trackingPx,
  type LabelWeight,
} from './legacy';
