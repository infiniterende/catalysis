/**
 * Catalysis design tokens — single source of truth for web and mobile.
 * Values come from the design handoff; `tokens.css` is generated from this file
 * (`pnpm tokens`), so edit here and regenerate rather than editing the CSS.
 */

export const colors = {
  /** Primary text, rules, black buttons, active boxes */
  ink: '#0E0E0E',
  /** Dark sections (issue bar, verse card, reels, create) */
  black: '#0B0B0B',
  /** Default app background (cream) */
  paper: '#F5F2EC',
  /** Bible reader background */
  paperReader: '#FBFAF7',
  white: '#FFFFFF',
  /** Accent: labels, numerals, active tab, drop cap, record button */
  crimson: '#A8141B',
  /** Scripture highlight (as lower 42% underline) */
  crimsonTint: '#EFD3CF',
  /** Crimson-family text on black */
  crimsonOnDark: '#F0B3B5',
  /** Long-form body copy */
  body: '#1A1917',
  /** Secondary text */
  muted: '#5A5750',
  /** Tertiary text, timestamps, placeholders */
  subtle: '#8C877E',
  /** Out-of-month dates, locked items */
  disabled: '#C4BEB3',
  /** Strikethrough color on completed prayers */
  strike: '#B8B2A7',
  /** Hairline dividers between list rows */
  rule: '#D9D4CA',
  /** Very light rules (bible book list) */
  ruleSoft: '#E4DFD5',
  /** Secondary text on black */
  onDarkMuted: '#CFCAC0',
  /** Italic deck/sub copy on photos */
  onDarkBody: '#E4E0D8',
  onDarkBodyBright: '#ECE8E0',
  onDarkCaption: '#DDD8CF',
  /** Bottom sheet on Create Post */
  sheet: '#161615',
  /** Landing hero sidebar */
  darkPanel: 'rgba(22,22,21,0.88)',
} as const;

export type ColorToken = keyof typeof colors;

/** CSS font stacks (web). Mobile uses the loaded font names in `nativeFonts`. */
export const fontFamilies = {
  display: "'Bodoni Moda', 'Bodoni 72', Didot, serif",
  text: "'Libre Caslon Text', 'Iowan Old Style', Georgia, serif",
  label: "'Hanken Grotesk', 'Helvetica Neue', Arial, sans-serif",
} as const;

/** Font names as registered by @expo-google-fonts on mobile. */
export const nativeFonts = {
  display: 'BodoniModa_400Regular',
  displayMedium: 'BodoniModa_500Medium',
  displayItalic: 'BodoniModa_400Regular_Italic',
  displayMediumItalic: 'BodoniModa_500Medium_Italic',
  text: 'LibreCaslonText_400Regular',
  textBold: 'LibreCaslonText_700Bold',
  textItalic: 'LibreCaslonText_400Regular_Italic',
  label: 'HankenGrotesk_500Medium',
  labelRegular: 'HankenGrotesk_400Regular',
  labelSemibold: 'HankenGrotesk_600SemiBold',
  labelBold: 'HankenGrotesk_700Bold',
} as const;

/** Letter-spacing in em. Multiply by font size on React Native. */
export const tracking = {
  label: 0.22,
  labelTight: 0.16,
  labelTiny: 0.1,
  labelTile: 0.14,
  masthead: 0.36,
  mastheadMobile: 0.34,
} as const;

export const spacing = {
  pageMobile: 22,
  pageDesktop: 36,
  statusBar: 50,
  tabBar: 76,
  readerPager: 66,
} as const;

export const breakpoints = {
  /** Large phones: room for a little more in a row. */
  small: 640,
  /** Below this the web app uses the mobile layouts. */
  mobile: 768,
  /** Below this side columns collapse under the main column. */
  desktop: 1024,
  /** Desktop reference width. */
  reference: 1320,
} as const;

/** Square editorial look: radius is 0 everywhere except true circles. */
export const radii = { none: 0, circle: 9999 } as const;

export const shadows = {
  /** Only used by the floating "+" on Discover. */
  fab: '0 8px 20px rgba(0,0,0,.25)',
} as const;

export const icon = { strokeWidth: 1.5 } as const;

/** Letter-spacing in px for React Native, which has no em unit. */
export function trackingPx(fontSize: number, em: number = tracking.label): number {
  return Math.round(fontSize * em * 100) / 100;
}

/* -------------------------------------------------------------------------- */
/* Gen Z direction (web): bento cards, pill buttons, a light and a dark theme. */
/* -------------------------------------------------------------------------- */

export interface GenZPalette {
  /** Page background */
  bg: string;
  /** Card surface */
  card: string;
  /** Recessed surface: inputs, list rows, inactive calendar days */
  inset: string;
  /** Hairline borders */
  line: string;
  ink: string;
  muted: string;
  subtle: string;
  /** Out-of-month dates */
  faint: string;
  /** The dark card: verse of the day, marquee, spotlight */
  solid: string;
  /** Primary button and active pill */
  btn: string;
  btnText: string;
  /** Text and icons on any accent surface */
  onA: string;
  /** Secondary text on an accent surface */
  onAm: string;
  logoBg: string;
  logoIc: string;
  /** Marquee band on the landing page */
  mqBg: string;
  mqText: string;
  /** Marquee stars; when absent they cycle through the accents */
  mqStar?: string;
  /** Accents: a1 primary, a2 highlight, a3–a6 tints */
  a1: string;
  a2: string;
  a3: string;
  a4: string;
  a5: string;
  a6: string;
}

export const genz = {
  /** "Sunset" */
  light: {
    bg: '#FFFFFF', card: '#FFFFFF', inset: '#F6F3F2', line: '#EFE9E7',
    ink: '#1B1F3B', muted: '#55586E', subtle: '#8A8CA0', faint: '#C6C7D2',
    solid: '#1B1F3B', btn: '#1B1F3B', btnText: '#FFFFFF',
    onA: '#1B1F3B', onAm: '#3A3D55', logoBg: '#1B1F3B', logoIc: '#F2553A',
    mqBg: '#1B1F3B', mqText: '#F4F4F6',
    a1: '#F2553A', a2: '#FFC857', a3: '#DCE1F5', a4: '#FFE1D6', a5: '#FFCFC2', a6: '#FFE9E1',
  },
  /** "Night" */
  dark: {
    bg: '#0C0C0F', card: '#16161B', inset: '#1F1F26', line: '#2A2A32',
    ink: '#FFFFFF', muted: '#A0A0AA', subtle: '#7C7C87', faint: '#4A4A52',
    solid: '#22222A', btn: '#C6FF3D', btnText: '#0C0C0F',
    onA: '#0C0C0F', onAm: '#2A2A30', logoBg: '#C6FF3D', logoIc: '#0C0C0F',
    mqBg: '#C6FF3D', mqText: '#0C0C0F', mqStar: '#0C0C0F',
    a1: '#FF8CC6', a2: '#C6FF3D', a3: '#F2F2F5', a4: '#FF8CC6', a5: '#FFB8DC', a6: '#FFD6EA',
  },
  /** Fixed colours that do not change with the theme. */
  fixed: {
    /** Text on `solid` */
    onSolid: '#F4F4F6',
    onSolidMuted: '#B4B4BA',
    onSolidSubtle: '#8A8A92',
    /** Body copy over photographs */
    onPhoto: '#EDEDF0',
    /** Month label on the dark date tile */
    lime: '#D7F75B',
  },
  fonts: {
    /** Outfit: headlines, numerals, the wordmark */
    display: "'Outfit', 'Helvetica Neue', Arial, sans-serif",
    /** DM Sans: interface and body copy */
    body: "'DM Sans', 'Helvetica Neue', Arial, sans-serif",
    /** Newsreader: scripture */
    scripture: "'Newsreader', 'Iowan Old Style', Georgia, serif",
  },
  radii: { card: 28, cardSmall: 24, tile: 16, row: 14, chip: 999 },
} as const satisfies {
  light: GenZPalette;
  dark: GenZPalette;
  fixed: Record<string, string>;
  fonts: Record<string, string>;
  radii: Record<string, number>;
};

export type GenZTheme = 'light' | 'dark';
