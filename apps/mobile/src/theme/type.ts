import type { TextStyle } from 'react-native';

/**
 * Custom fonts are addressed by their loaded family name, never by `fontWeight` /
 * `fontStyle`, which Android ignores for custom faces. The names are the keys
 * passed to `useFonts` in the root layout.
 */
export const families = {
  display: {
    light: 'Outfit_300Light',
    regular: 'Outfit_400Regular',
    medium: 'Outfit_500Medium',
    bold: 'Outfit_700Bold',
    extrabold: 'Outfit_800ExtraBold',
  },
  body: {
    regular: 'DMSans_400Regular',
    medium: 'DMSans_500Medium',
    semibold: 'DMSans_600SemiBold',
    bold: 'DMSans_700Bold',
  },
  scripture: {
    regular: 'Newsreader_400Regular',
    medium: 'Newsreader_500Medium',
  },
} as const;

export type DisplayWeight = keyof typeof families.display;
export type BodyWeight = keyof typeof families.body;
export type ScriptureWeight = keyof typeof families.scripture;

export interface TypeOptions {
  /** Multiplier, as in the design's CSS (`line-height: 1.12`). */
  lineHeight?: number;
  /** Letter-spacing in em, as in the design's CSS (`-.04em` → `-0.04`). */
  tracking?: number;
}

const round = (value: number) => Math.round(value * 100) / 100;

function metrics(size: number, { lineHeight, tracking }: TypeOptions = {}): TextStyle {
  const style: TextStyle = { fontSize: size };
  if (lineHeight) style.lineHeight = round(size * lineHeight);
  if (tracking) style.letterSpacing = round(size * tracking);
  return style;
}

/** Outfit: headings, numbers, accent words. */
export function display(size: number, weight: DisplayWeight = 'bold', opts?: TypeOptions): TextStyle {
  return { fontFamily: families.display[weight], ...metrics(size, opts) };
}

/** DM Sans: interface and body copy. */
export function body(size: number, weight: BodyWeight = 'regular', opts?: TypeOptions): TextStyle {
  return { fontFamily: families.body[weight], ...metrics(size, opts) };
}

/** Newsreader: Scripture only. */
export function scripture(size: number, weight: ScriptureWeight = 'regular', opts?: TypeOptions): TextStyle {
  return { fontFamily: families.scripture[weight], ...metrics(size, opts) };
}

/** The design's `.mn` label: DM Sans 600, uppercase, +0.08em. */
export function caps(size = 11): TextStyle {
  return {
    fontFamily: families.body.semibold,
    fontSize: size,
    letterSpacing: round(size * 0.08),
    textTransform: 'uppercase',
  };
}
