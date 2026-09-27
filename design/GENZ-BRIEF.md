# Gen Z web redesign — shared brief for everyone working on `apps/web`

The web app is being rebuilt from the editorial design to the **Gen Z v2** design.
Logic, data and routes stay; the visual layer is replaced.

## Sources of truth
- Design: `design/Catalysis Web GenZ v2.dc.html`. Seven 1320px-wide frames. **Inline styles are exact**: sizes,
  weights, radii, padding, colours (as CSS variables) and copy. Read your frames fully before writing.
- Class names in the design map to: `.bq` Outfit (display), `.is` Outfit too (an accent span: same weight as its
  parent unless it stands alone, where it is weight 400), `.gs` DM Sans (body/UI), `.nr` Newsreader (scripture),
  `.mn` small caps label (DM Sans 600, 11px, uppercase, .08em). These classes exist in `app/globals.css`.
- Colours are theme tokens, available as Tailwind classes: `bg-bg bg-card bg-inset bg-solid bg-btn bg-a1…bg-a6`,
  `text-ink text-muted text-subtle text-faint text-btn-text text-on-a text-on-am text-on-solid
  text-on-solid-muted text-on-solid-subtle text-on-photo text-lime`, `border-line`. `white` and `black` exist.
  The design's `var(--btnText)` is `btn-text`, `var(--onA)` is `on-a`, `var(--onAm)` is `on-am`.
- There are two themes, light and dark, switched at runtime. **Never hard-code a themed colour.** Text on any
  accent surface (`a1`–`a6`) is `text-on-a`. Text on `solid` and on photographs is white / `on-solid` / `on-photo`.
  The design's `rgba(18,18,18,.x)` overlays on accent cards stay as written.

## Foundation you must use (read these first, do not edit them)
- `apps/web/components/ui.tsx` — `Card` (surface: card | inset | solid | a1…a6), `CardTitle`, `Pill`
  (variants primary | accent | highlight | dark | white | ghost | inset | onSolid; takes `href` or button props,
  `icon`, `iconAfter`), `CircleButton`, `TextAction`, `Chip`, `Avatar`, `Progress`, `Segmented`, `Skeleton`,
  `SkeletonLines`, `EmptyState`, `FieldError`, `Field`, `Photo`, `Sheet`, `SheetAction`, `PageTitle`, `Ico`
  (lucide icon, stroke 2), `cx`, `TONE_BG`, `toneFor`, `initials`.
- `apps/web/components/shell.tsx` — `Page` (page frame; `fill` pins it to the viewport height on desktop so
  inner panels scroll), `BackLink`. The shell already renders the top bar and the bottom navigation; never
  render navigation yourself.
- `apps/web/lib/` — `store.tsx` (`useApp(selector)`, `useAppStore()`), `hooks.ts` (`useIsDesktop` ≥768,
  `useIsWide` ≥1024, `useToday`, `useNow`, `useDismiss`), `media.ts`, `lumen.ts`, `theme.tsx`.
- `apps/web/app/(app)/today/page.tsx` — the finished Home page. **Use it as your pattern** for structure, naming,
  class style and responsiveness.
- `packages/api/src/*` — all business logic and demo content (`index.ts` re-exports everything). Use it; never
  re-implement it. Read the modules your screens touch.

## The files you are given already exist
Each of your files currently holds the **old editorial implementation**. Its imports are broken (the old
`Button`, `IconButton`, `Tabs`, `Tag`, `Masthead`, `MobileHeader` are gone) but its **logic is correct and
tested by hand**: store calls, hooks, state, edge cases, accessibility labels, empty and error states. Keep
that behaviour; replace the markup and styling. Do not drop a behaviour because the design frame does not
show it (empty states, errors, report/block, sheets…).

## Rules
- Only edit the files assigned to you. Do not edit `components/ui.tsx`, `components/shell.tsx`, `lib/*`,
  `app/globals.css`, `packages/*`, or another agent's files. If you need a shared piece that is missing, build
  it inside your own file and mention it in your report.
- Responsive, one markup: write mobile-first Tailwind. Bento grids are `grid-cols-1` → `md:grid-cols-2` →
  `lg:grid-cols-12` with `lg:col-span-n` matching the design's `grid-column`. Multi-column app layouts
  (sidebars) stack below `lg`. The design's fixed heights become `min-h-[…]`. Nothing may overflow
  horizontally at 375px. Type scales down on mobile (e.g. `text-[40px] md:text-[56px]`).
- Exact values: use Tailwind arbitrary values to match the design (`rounded-[28px]`, `p-[26px]`, `text-[15px]`,
  `tracking-[-.03em]`).
- No dead controls. Every button does something real, or is left out. If the design shows a control you
  cannot make real, leave it out and say so in your report.
- Accessibility: real `button`/`a` elements, `aria-label` on icon-only controls, `aria-pressed` /
  `aria-checked` / `aria-selected` on toggles, headings in order, focus visible, targets ≥ 40px where possible.
- Hover (desktop only): use the `hover-dim`, `hover-lift`, `hover-inset`, `hover-accent` classes.
- Loading = `Skeleton`; empty = `EmptyState`.
- Code quality: TypeScript strict, small components, no `any`, comments only where something is not obvious.
- Do NOT use browser tools (`mcp__Claude_Browser__*`, `mcp__claude-in-chrome__*`), do NOT start or stop dev
  servers, do NOT run `next build` or `next dev`. Do not commit.

## Verify (from `apps/web`)
1. `npx tsc --noEmit 2>&1 | grep -E "<your file paths>"` — no errors in your files. Other files may still
   have errors while they are being rewritten; ignore those.
2. `npx eslint <your files>` — no errors or warnings.

## Report (under 300 words)
What you built; results of the two checks; anything in the design you left out or changed and why; anything
you needed from the shared files that was missing.
