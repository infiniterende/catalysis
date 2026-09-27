# Gen Z mobile redesign — shared brief for everyone working on `apps/mobile`

The Expo app is being rebuilt from the editorial design to the **Gen Z mobile** design.
Logic, data, routes and native behaviour stay; the visual layer is replaced, and the app gains a
light and a dark theme.

## Sources of truth
- `design/mobile/README.md` — the handoff: tokens, type, shapes, components, the 12 screens, behaviour. Read it all.
- `design/mobile/Catalysis Mobile GenZ.dc.html` — 12 frames, 390×844. **Inline styles are exact**: sizes, weights,
  radii, padding, colours (as CSS variables) and copy. Read your frames fully before writing a screen.
  Frame markers look like `<!-- ===== 03 · HOME ===== -->`. The status bar drawn in each frame is the phone's
  own; never draw it — use safe-area insets.
- Class names in the design: `.bq` Outfit, `.gs` DM Sans, `.nr` Newsreader, `.mn` caps label (DM Sans 600,
  11px, uppercase, +0.08em).
- Tokens: `genz` in `packages/ui-tokens/src/index.ts` (`genz.light`, `genz.dark`, `genz.fixed`). The design's
  `var(--btnText)` is `btnText`, `var(--onA)` is `onA`.
- The app's Bible text is the NABRE (not RSV-CE): show `chapter.edition.short` / `defaultEditionShort()` wherever
  the design prints "RSV-CE".

## Theme rules
- Two themes, switched at runtime (System / Light / Dark). **Never hard-code a themed colour**; read colours
  from the theme hook. Styles that depend on colour are created from the theme, not at module level.
- Text and icons on any accent fill (`a1`–`a6`) use `onA`. Text on `solid` and on photographs is white.
- The design's `rgba(18,18,18,.x)` overlays on accent cards stay as written.

## The existing code is your starting point
Every screen already exists in the editorial style and **its logic is correct**: store calls, hooks,
navigation, native modules (camera, video, notifications, calendar, haptics, clipboard, sharing), platform
guards for web, accessibility labels, empty and error states, report/block. Keep that behaviour; replace the
presentation. Do not drop a behaviour because the frame does not show it.

`packages/api/src/*` holds all business logic and demo content (`index.ts` re-exports everything).
Use it; never re-implement it. New since the editorial build, and available to you:
`bestStreak(state)`, `longestStreak`, `buildMonth`, `feedReels(state, feed)`, `reportReel`, `hiddenReelIds`,
`toggleReminder` / `reminderIds`, `Highlight.color` (a `Tone`), `CalendarEvent.tone`, `Message.feedback`,
`verseRuns(verse, marks)` with coloured marks, `suggestedVerses()`, `TONIGHT.headline/summary/media/time`,
`AssetKey` `monstrance`.

## Rules
- Only edit files under `apps/mobile/`, and only the ones assigned to you. Never edit `packages/*`, `apps/web`,
  or root files. If a shared piece is missing, build it in your own file and say so in your report.
- Expo SDK 57 / React Native 0.86 / Expo Router; React Compiler is on. Expo APIs change between SDKs: check
  https://docs.expo.dev/versions/v57.0.0/ before using one you have not used in this codebase.
  Add packages only with `npx expo install <pkg>` from `apps/mobile`.
- Custom fonts are addressed by loaded family name per weight, never by `fontWeight` / `fontStyle`.
  Letter-spacing is in px: `fontSize × em`.
- No dead controls: every control does something real or is left out (and mentioned in your report).
- Accessibility: `accessibilityRole` and `accessibilityLabel` on icon-only controls, `accessibilityState` on
  toggles, tabs and checkboxes, hit targets at least 44pt.
- The web build of this app must keep working: guard native-only modules with `Platform.OS` or try/catch, as
  the existing code does.
- Do NOT use browser tools (`mcp__Claude_Browser__*`, `mcp__claude-in-chrome__*`) or the iOS simulator tool,
  do NOT start dev servers, do NOT commit.

## Verify (from `apps/mobile`)
1. `npx tsc --noEmit` — no errors in your files (others may be mid-rewrite).
2. `npx expo lint` — no errors or warnings in your files.
Bundle exports are run by the lead once all screens are in.

## Report (under 300 words)
What you built; the results of the checks; anything in the design you left out or changed and why; anything
you needed that was missing.
