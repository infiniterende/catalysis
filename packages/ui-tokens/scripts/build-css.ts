// Generates tokens.css (a Tailwind v4 @theme block) from src/index.ts.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { breakpoints, colors, genz } from '../src/index.ts';

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

const lines = [
  '/* GENERATED from packages/ui-tokens/src/index.ts — run `pnpm tokens`; do not edit. */',
  '@theme {',
  '  --color-*: initial;',
  '  --color-transparent: transparent;',
  '  --color-current: currentColor;',
  ...Object.entries(colors).map(([name, value]) => `  --color-${kebab(name)}: ${value};`),
  '',
  "  --font-display: var(--font-bodoni), 'Bodoni 72', Didot, serif;",
  "  --font-text: var(--font-caslon), 'Iowan Old Style', Georgia, serif;",
  "  --font-label: var(--font-hanken), 'Helvetica Neue', Arial, sans-serif;",
  '',
  '  --breakpoint-*: initial;',
  `  --breakpoint-sm: ${breakpoints.small}px;`,
  `  --breakpoint-md: ${breakpoints.mobile}px;`,
  `  --breakpoint-lg: ${breakpoints.desktop}px;`,
  `  --breakpoint-xl: ${breakpoints.reference}px;`,
  '',
  '  --radius-*: initial;',
  '  --radius-none: 0;',
  '  --radius-full: 9999px;',
  '}',
  '',
];

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'tokens.css');
writeFileSync(out, lines.join('\n'));
console.log(`wrote ${out}`);

// Gen Z direction: the palette lives in CSS variables so the theme can switch at runtime.
const vars = (palette: Record<string, string | undefined>) =>
  Object.entries(palette)
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => `  --${kebab(name)}: ${value};`);
const genzLines = [
  '/* GENERATED from packages/ui-tokens/src/index.ts — run `pnpm tokens`; do not edit. */',
  ':root,',
  '[data-theme="light"] {',
  ...vars(genz.light),
  ...vars(genz.fixed),
  '  color-scheme: light;',
  '}',
  '',
  '[data-theme="dark"] {',
  ...vars(genz.dark),
  '  color-scheme: dark;',
  '}',
  '',
  '@theme inline {',
  '  --color-*: initial;',
  '  --color-transparent: transparent;',
  '  --color-current: currentColor;',
  '  --color-white: #FFFFFF;',
  '  --color-black: #000000;',
  ...Object.keys({ ...genz.light, ...genz.fixed }).filter((name) => name !== 'mqStar').map((name) => `  --color-${kebab(name)}: var(--${kebab(name)});`),
  '',
  '  --font-display: var(--font-outfit), sans-serif;',
  '  --font-body: var(--font-dm-sans), sans-serif;',
  '  --font-scripture: var(--font-newsreader), serif;',
  '',
  '  --breakpoint-*: initial;',
  `  --breakpoint-sm: ${breakpoints.small}px;`,
  `  --breakpoint-md: ${breakpoints.mobile}px;`,
  `  --breakpoint-lg: ${breakpoints.desktop}px;`,
  `  --breakpoint-xl: ${breakpoints.reference}px;`,
  '}',
  '',
];
const genzOut = join(root, 'genz.css');
writeFileSync(genzOut, genzLines.join('\n'));
console.log(`wrote ${genzOut}`);
