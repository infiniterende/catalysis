/**
 * LEGACY SHIMS — delete this file once every screen is on the new kit.
 *
 * The editorial screens that have not been restyled yet still import the old
 * theme (`colors`, `text()`, `label()`, `display(size, { italic })`…). These
 * shims keep them compiling and map them onto the new fonts and the LIGHT
 * palette. They are static: a legacy screen does not follow the dark theme.
 *
 * New code must not import anything from here. Use `useTheme()` / `useStyles()`
 * and `display` / `body` / `scripture` / `caps` instead (see KIT.md).
 *
 * When this file goes, `src/theme/index.ts` exports `display` straight from './type'.
 */
import { genz, spacing, tracking, trackingPx, type colors as editorialColors } from '@catalysis/ui-tokens';
import type { TextStyle } from 'react-native';

import { fixed } from './tokens';
import { display as themedDisplay, families, type BodyWeight, type DisplayWeight, type TypeOptions } from './type';

export { spacing, tracking, trackingPx };

const light = genz.light;

/** @deprecated Use `useTheme().colors`. */
export const colors: Record<keyof typeof editorialColors, string> = {
  ink: light.ink,
  black: light.solid,
  paper: light.bg,
  paperReader: light.bg,
  white: fixed.white,
  crimson: light.a1,
  crimsonTint: light.a2,
  crimsonOnDark: light.a5,
  body: light.ink,
  muted: light.muted,
  subtle: light.subtle,
  disabled: light.faint,
  strike: light.faint,
  rule: light.line,
  ruleSoft: light.line,
  onDarkMuted: fixed.onSolidMuted,
  onDarkBody: fixed.onPhoto,
  onDarkBodyBright: fixed.onSolid,
  onDarkCaption: fixed.onPhoto,
  sheet: genz.dark.card,
  darkPanel: 'rgba(27,31,59,0.88)',
};

/** @deprecated Family names by their editorial role. Use the type helpers. */
export const fonts = {
  display: families.display.medium,
  displayMedium: families.display.bold,
  displayItalic: families.display.medium,
  displayMediumItalic: families.display.bold,
  text: families.body.regular,
  textBold: families.body.bold,
  textItalic: families.body.regular,
  label: families.body.medium,
  labelRegular: families.body.regular,
  labelSemibold: families.body.semibold,
  labelBold: families.body.bold,
} as const;

/** @deprecated Translucent whites used on the old black screens. */
export const onDark = {
  rule: 'rgba(255,255,255,0.2)',
  ruleSoft: 'rgba(255,255,255,0.12)',
  ruleSheet: 'rgba(255,255,255,0.14)',
  outline: 'rgba(255,255,255,0.45)',
  outlineSoft: 'rgba(255,255,255,0.4)',
  outlineStrong: 'rgba(255,255,255,0.7)',
  inactive: 'rgba(255,255,255,0.62)',
} as const;

/** @deprecated Use `BodyWeight`. */
export type LabelWeight = BodyWeight;

const leading = (size: number, lineHeight?: number): TextStyle =>
  lineHeight ? { lineHeight: Math.round(size * lineHeight * 100) / 100 } : {};

/** @deprecated Use `caps(size)`. DM Sans caps at the old tracking. */
export function label(size = 10, weight: LabelWeight = 'medium', em: number = tracking.label): TextStyle {
  return {
    fontFamily: families.body[weight],
    fontSize: size,
    letterSpacing: trackingPx(size, em),
    textTransform: 'uppercase',
  };
}

/** @deprecated Use `body(size, weight)`. */
export function sans(size: number, weight: LabelWeight = 'regular'): TextStyle {
  return { fontFamily: families.body[weight], fontSize: size };
}

/** @deprecated Use `body(size, weight, { lineHeight })`. Italic has no counterpart and is dropped. */
export function text(
  size: number,
  options: { italic?: boolean; bold?: boolean; lineHeight?: number } = {},
): TextStyle {
  return {
    fontFamily: options.bold ? families.body.bold : families.body.regular,
    fontSize: size,
    ...leading(size, options.lineHeight),
  };
}

interface LegacyDisplayOptions {
  italic?: boolean;
  medium?: boolean;
  lineHeight?: number;
}

/** @deprecated Outfit has one optical size and no italic: regular → 500, medium → 700. */
export function displayFamily(_size: number, options: { italic?: boolean; medium?: boolean } = {}): string {
  return options.medium ? families.display.bold : families.display.medium;
}

/** Outfit: headings, numbers, accent words. */
export function display(size: number, weight?: DisplayWeight, opts?: TypeOptions): TextStyle;
/** @deprecated The editorial signature. Use `display(size, weight, { lineHeight, tracking })`. */
export function display(size: number, options: LegacyDisplayOptions): TextStyle;
export function display(size: number, second?: DisplayWeight | LegacyDisplayOptions, opts?: TypeOptions): TextStyle {
  if (typeof second === 'object') {
    return { fontFamily: displayFamily(size, second), fontSize: size, ...leading(size, second.lineHeight) };
  }
  return themedDisplay(size, second, opts);
}
