# Gen Z kit — read this before restyling a screen

Reference screens: `src/app/index.tsx` (Welcome), `src/app/login.tsx`, `src/app/(tabs)/today.tsx` (Home; its pieces are
in `src/components/home/*`). Design rules: `design/mobile/BRIEF.md`.

## Theme — `import { … } from '@/theme'`
```tsx
const themed = (c: ThemeColors, scheme: Scheme) =>      // module level, returns StyleSheet.create
  StyleSheet.create({ title: { ...display(24, 'bold', { tracking: -0.03 }), color: c.ink } });

function Thing() {
  const styles = useStyles(themed);                      // cached per factory per theme
  const { colors, scheme, appearance, setAppearance } = useTheme();   // colours for props (icon colour…)
}
```
- `colors` = `genz.light | genz.dark` + fixed colours (`white`, `onWhite`, `onSolidDim`, `onSolidLine`, `photo`, `glass`,
  `glassSoft`, `glassStrong`, `accentWash`, `accentShade`, `backdrop`, `onSolid*`, `onPhoto`). Never hard-code a themed colour.
- `appearance` is `'system' | 'light' | 'dark'`; `setAppearance(x)` applies at once and persists (`catalysis.appearance`).
  Profile's Appearance control calls it. Storage lives in `src/lib/appearance.ts`.
- Styles with no colour in them may stay in a plain module-level `StyleSheet.create`.
- Type helpers return `TextStyle` without colour; `lineHeight` is a multiplier and `tracking` is in em, as in the CSS:
  `display(size, 'light'|'regular'|'medium'|'bold'|'extrabold' = 'bold', { lineHeight?, tracking? })` Outfit ·
  `body(size, 'regular'|'medium'|'semibold'|'bold' = 'regular', opts?)` DM Sans ·
  `scripture(size, 'regular'|'medium', opts?)` Newsreader · `caps(size = 11)` the `.mn` label.
  Outfit 600 is not loaded: use `'bold'`. No italics are loaded.
- Tones: `toneColor(colors, 'a1'…'a6')`, `toneFor(key)` (stable a3/a4/a5 tint for an id, name or index),
  `onSurface(colors, surface)` → `{ text, muted }` for content on a card, `surfaceColor(colors, surface)`.
- Shapes: `radii` (`card` 28, `cardSmall` 22, `input` 18, `tile` 16, `pill`), `layout` (`screen` 20, `screenWide` 24,
  `gap` 10, `hitTarget` 44), `shadows` (`tabBar`, `floating`, `fab`, `sticker`, `photo`, `segment` — use as `boxShadow`),
  `tabBar` metrics, `HIT_SLOP`, `WEB_FRAME_WIDTH`.
- Status bar follows the theme. Over dark imagery: `<Screen statusBar="light">` or `<FocusedStatusBar style="light" />`.
- Haptics: `tapHaptic()` / `successHaptic()` from `@/lib/haptics` (no-ops on web).

## Tab bar
Floating, takes no layout space. Shown on Home, Bible, Prayer, Community, Reels, Discover; hidden on `events` (now a
pushed-style screen: give it a back button, `router.back()` returns to where the user came from).
- Scrolling screen: `const space = useTabBarSpace()` → `contentContainerStyle={{ paddingBottom: space }}`.
- Fixed screen: `<Screen tabBar>`. Floating things above the bar (FAB, toolbars): `bottom: space`.
- `TAB_BAR_SPACE` (100) is the constant; `useTabBarSpace()` adds the bottom safe-area inset.

## Components — `import { … } from '@/components/ui'`
Pressable pieces take `onPress` or `href` (an Expo Router `Href`; the control is then announced as a link).
- `Screen` — `background?: 'bg'|'card'|'inset'|'photo'`, `padTop = true`, `padBottom`, `tabBar`, `statusBar?`, `style`
- `ScreenHeader` — `title`, `titleSize = 36`, `subtitle`, `back?: boolean | fn`, `backVariant`, `leading`, `center`,
  `actions`, `divider`, `padH`. No `back` → large tab title; with `back` → compact title beside the button.
- `Card` — `surface = 'card'` (`card|inset|solid|a1…a6`), `radius = 28`, `padding = 18`, `onPress|href`, a11y label
- `Pill` — `label`, `variant = 'primary'` (`primary|accent|highlight|dark|white|ghost|inset|onSolid`),
  `size = 'md'` (`sm|md|lg`), `icon`, `trailingIcon`, `full`, `disabled`, `busy`, `selected`, overrides `fontSize|padV|padH|weight`
- `IconButton` — `name`, `label` (a11y), `variant = 'inset'` (`inset|primary|accent|highlight|glass|plain`), `size = 44`,
  `iconSize`, `shape: 'circle'|'rounded'`, `elevated` (FAB), `filled`, `selected`, `disabled`
- `Chip` — `label`, `tone` (`a1…a6|btn|inset|white|dark|line|wash|glass`), `size = 'sm'` (`sm` tag, `md` action,
  `lg` filter), `icon`, `selected` (toggle: on = `tone ?? 'btn'`, off = `offTone ?? 'inset'`), `onPress|href`
- `Avatar` — `name`, `source?: Media | url`, `size = 44`, `shape: 'circle'|'rounded'`, `tone`, `letters: 1|2`, `weight`, `accessible`
- `StoryRing` — `children` (avatar/photo of `size - STORY_RING_INSET`), `seen`, `size = 62`, `label`, `onPress`
- `ProgressBar` — `value` 0–1, `height = 7`, `tone = 'a1'`, `track: 'inset'|'onAccent'`, `accessibilityLabel`
- `WeekBars` — `week` (from `buildWeek`), `compact`; draws in `onA`, so place it on an accent card
- `Segmented` — `options`, `value`, `onChange`, `variant: 'card'|'btn'`, `size: 'md'` (full width) `|'sm'` (hugs)
- `SectionTitle` — `children`, `right?: string | node`, `size = 20`
- `PrayerRow` — `title`, `done`, `next`, `meta`, `action?: { label, onPress }`, `outlined` (Prayer screen), `compact`
  (in a card), `onPress` (toggle), `onLongPress`
- `ListRow` — `label`, `icon`, `value`, `right` (replaces the chevron), `divider`, `destructive`, `onPress|href`
- `Switch` — `value`, `onChange`, `label` (a11y), `disabled`
- `Field` / `FieldError` — `label`, `labelStyle: 'caps'|'plain'`, `hideLabel`, `error`, `icon`, `accessory`, + `TextInput` props
- `SearchBar` — `placeholder`, + `TextInput` props; with `onPress|href` it is a button that looks like the field
- `Sheet` — `visible`, `onClose`, `title`, `message`, `scroll`, `children`
- `SheetAction` — `label`, `onPress`, `icon`, `detail`, `destructive`, `selected`, `closes = true` (closes the sheet first)
- `ActionSheet` — `visible`, `onClose`, `title`, `message`, `actions: SheetActionProps[]`
- `Skeleton` (`width`, `height`, `radius`) · `SkeletonLines` (`lines`, `gap`, `height`)
- `EmptyState` — `children` (message), `title`, `icon`, `action`, `align`
- `Photo` (`media`, `radius`, `children`, `accessibilityLabel`) · `Scrim` (`strength`, `from`, `to`) · `Placeholder`
- `Icon` — `name`, `size = 19`, `color` (default `ink`), `filled`, `strokeWidth = 2`. Every icon in the 12 frames is
  mapped, plus `eye-off`, `pause`, `user`, `flag`, `copy`, `trash`, `log-out`, `map-pin`, `calendar-plus`.
  Add new ones to the map in `ui/Icon.tsx` (one import per icon). `home` and `house` are the same glyph.
- `Divider` (`label?`) · `Logo` (`size = 34`, `markOnly`) · `Touchable` (`Pressable` + pressed opacity and hit slop) ·
  `TabBar`, `TABS`, `TabKey` · `FocusedStatusBar`

## Legacy shims — delete when nothing imports them
Legacy code is static: it always renders in the **light** palette, even in the dark theme. Do not mix it into a
restyled screen. When your screen no longer imports a legacy file, leave the file; the lead removes them at the end.
`src/theme/legacy.ts` (re-exported by `@/theme`):
| Old | Maps to | Use instead |
|---|---|---|
| `colors.ink / body` | `light.ink` | `colors.ink` from the theme |
| `colors.paper / paperReader` | `light.bg` | `colors.bg` |
| `colors.black` | `light.solid` | `colors.solid`, or `colors.photo` behind media |
| `colors.crimson` | `light.a1` | `colors.a1` |
| `colors.crimsonTint` / `crimsonOnDark` | `light.a2` / `light.a5` | highlight tones |
| `colors.rule / ruleSoft` | `light.line` | `colors.line` |
| `colors.disabled / strike` | `light.faint` | `colors.faint` |
| `colors.onDarkMuted / onDarkBody / onDarkCaption` | fixed `onSolidMuted / onPhoto` | `colors.white`, `colors.onSolidDim` |
| `colors.sheet` | `dark.card` | `colors.card` |
| `display(size, { italic, medium, lineHeight })` | Outfit 500, or 700 when `medium` | `display(size, weight, opts)` |
| `displayFamily()` | Outfit family name | `families.display.*` |
| `text(size, { bold, italic, lineHeight })` | DM Sans 400 / 700 | `body()`; `scripture()` for Bible text |
| `label(size, weight, em)` | DM Sans caps, old tracking | `caps(size)` |
| `sans(size, weight)` | DM Sans | `body()` |
| `fonts.*`, `LabelWeight` | DM Sans / Outfit names, `BodyWeight` | `families`, `BodyWeight` |
| `spacing`, `tracking`, `trackingPx`, `onDark` | unchanged | `layout`, type helper `tracking`, fixed colours |

`display` is one overloaded function for now: a weight string is the new signature, an options object the old one.

Legacy component files in `src/components/*.tsx` (old implementations, left in place on the light palette):
| Old import | New piece |
|---|---|
| `Buttons`: `PrimaryButton`, `OutlineButton` | `Pill` (`primary`, `ghost`) |
| `Buttons`: `Chip`, `TextLink` | `Chip` / `Pill size="sm"` |
| `Label`: `Label`, `Tag` | `caps()` text, `Chip` |
| `Masthead`: `Masthead`, `HeaderBar` | `Logo`, `ScreenHeader` |
| `Rows`: `Rule`, `NumberedRow`, `DisclosureRow`, `SectionHeading`, `StatGrid` | `Divider`, `PrayerRow` / `ListRow`, `ListRow`, `SectionTitle`, `Card` tiles |
| `Tabs` | `Segmented`, or `Chip selected` for filters |
| `Touchable`: `Touchable`, `IconButton` (bare icon) | `Touchable`, `IconButton` (`variant="plain"` for bare) |
| `Icon`, `Photo` (`Photo`, `Scrim`, `Placeholder`) | same names in the kit |
| `Sheet`: `Sheet`, `ActionSheet`, type `SheetAction` | `Sheet`, `ActionSheet`, `SheetActionProps`; `SheetAction` is now a component |
| `States`: `Skeleton`, `SkeletonLines`, `EmptyState` | same names in the kit |
| `Field`: `Field`, `FieldError` | same names in the kit |
| `Composer` | build from `Field`-style pill + `IconButton variant="accent"` (Lumen owns it) |
| `Screen`: `Screen tone=…`, `FocusedStatusBar` | `Screen background=…`; the legacy one also pads for the tab bar inside `(tabs)` |
| `TabBar` | wrapper around the kit's `TabBar` |
| `features/prayer/WeekBars` | kit `WeekBars` |
