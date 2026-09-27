import type { ThemeColors, Tone } from './tokens';

export const TONES: readonly Tone[] = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];

/** What a card, chip or tile can be filled with. */
export type Surface = 'card' | 'inset' | 'solid' | Tone;

export function isTone(value: string): value is Tone {
  return (TONES as readonly string[]).includes(value);
}

/** The accent fill for a tone in the current theme. */
export function toneColor(colors: ThemeColors, tone: Tone): string {
  return colors[tone];
}

/** The soft tints, used where content has no tone of its own. */
const TINTS: readonly Tone[] = ['a3', 'a4', 'a5'];

/**
 * A stable tint for a key (a user id, a name, a list index), so avatars and
 * cards vary but each keeps its colour between renders.
 */
export function toneFor(key: string | number): Tone {
  if (typeof key === 'number') return TINTS[Math.abs(Math.trunc(key)) % TINTS.length] ?? 'a3';
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) % 9973;
  return TINTS[hash % TINTS.length] ?? 'a3';
}

export function surfaceColor(colors: ThemeColors, surface: Surface): string {
  return colors[surface];
}

/**
 * Text colours for content on a surface: accents take `onA`, `solid` takes
 * white, neutral surfaces take `ink` / `muted`.
 */
export function onSurface(colors: ThemeColors, surface: Surface): { text: string; muted: string } {
  if (surface === 'solid') return { text: colors.white, muted: colors.onSolidDim };
  if (surface === 'card' || surface === 'inset') return { text: colors.ink, muted: colors.muted };
  return { text: colors.onA, muted: colors.onAm };
}
