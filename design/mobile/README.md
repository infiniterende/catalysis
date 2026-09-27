# Handoff: Catalysis Mobile (Gen Z theme, light + dark)

## Overview
Catalysis is a Catholic companion app for Gen Z / college Catholics: daily scripture (RSV-CE), prayer guide + streak tracker, community feed with prayer intentions, short-form reels + photo posts, events & liturgical calendar, profile, and **Lumen**, an AI assistant that answers from Scripture and the Catechism with citations.

This package covers the **mobile app (iOS + Android)** — 12 screens, each in **light and dark mode**. The matching web design (`Catalysis Web GenZ v2.dc.html`) is included for reference and shares the same tokens.

## About the design files
The `.dc.html` files are **HTML design references**, not production code. Recreate them in the target stack using its own patterns. Open `Catalysis Mobile GenZ.dc.html` in a browser (keep `support.js` and `assets/` beside it). Click **"Switch to dark mode"** above the screens (or the Appearance toggle on Profile) to see dark mode. Inline styles are the source of truth for exact values.

## Fidelity
**High-fidelity.** Colors, type, radii, spacing and copy are final.

## Recommended stack
- **Expo (React Native) + TypeScript + Expo Router**
- Theming: a `ThemeProvider` exposing the tokens below; follow system appearance by default (`useColorScheme`) with a user override persisted in AsyncStorage (Profile → Appearance: System / Light / Dark).
- Fonts: `@expo-google-fonts/outfit`, `@expo-google-fonts/dm-sans`, `@expo-google-fonts/newsreader`.
- Icons: `lucide-react-native` (stroke width 2).
- Video: `expo-video` (reels playback), `expo-camera` (record), `expo-image-picker` (upload). Backend transcoding via Mux / Cloudflare Stream.
- Backend: Supabase (Auth: email, Google, Apple; Postgres; Storage; Realtime) or equivalent.
- Lumen: Claude API **server-side only** (edge function). Stream responses; return citations as structured data.
- RSV-CE text requires a license (Ignatius Press / NCC).

## Design tokens
Semantic tokens — components reference these names, never raw hex.

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | #FFFFFF | #0C0C0F | Screen background |
| `card` | #FFFFFF | #16161B | Cards (with 1px `line` border) |
| `inset` | #F6F3F2 | #1F1F26 | Inputs, chips, list rows, icon buttons |
| `line` | #EFE9E7 | #2A2A32 | Borders, dividers |
| `ink` | #1B1F3B | #FFFFFF | Primary text |
| `muted` | #55586E | #A0A0AA | Secondary text |
| `subtle` | #8A8CA0 | #7C7C87 | Tertiary text, placeholders |
| `faint` | #C6C7D2 | #4A4A52 | Disabled / locked |
| `solid` | #1B1F3B | #22222A | Dark feature cards (verse card, tab bar, user chat bubble); text on it is always #FFFFFF |
| `btn` | #1B1F3B | #C6FF3D | Primary button / active pill |
| `btnText` | #FFFFFF | #0C0C0F | Text on `btn` |
| `onA` | #1B1F3B | #0C0C0F | Text/icons on ANY accent fill (a1–a6) |
| `a1` | #F2553A coral | #FF8CC6 pink | Main accent: Lumen, accent headline word, Explain, record, verse numbers |
| `a2` | #FFC857 sun | #C6FF3D lime | Streak, success, "I prayed", active tab pill |
| `a3` | #DCE1F5 | #F2F2F5 | Soft card (Examen, Scripture source, avatars) |
| `a4` | #FFE1D6 peach | #FF8CC6 | Soft card (Next up, quote block, Lectio) |
| `a5` | #FFCFC2 | #FFB8DC | Soft card (Divine Mercy, profile avatar) |
| `a6` | #FFE9E1 | #FFD6EA | Tag fill (Prayer request) |
| `logoBg` / `logoIc` | #1B1F3B / #F2553A | #C6FF3D / #0C0C0F | App mark |

**Rule:** accent fills are light in both themes, so text on them is always `onA` (dark). Text on neutral surfaces uses `ink/muted/subtle`, which flip.

### Typography
- **Outfit** — headings, numbers, accent words. Weights 300 / 500 / 700 / 800. Letter-spacing −0.02 to −0.045em on large sizes.
- **DM Sans** — all UI and body text (400–700). Labels: uppercase, 600, 11px, +0.08em.
- **Newsreader** — Scripture body only (20px / 1.72).

| Role | Font | Size |
|---|---|---|
| Hero headline | Outfit 800 | 48–50 / 0.95 |
| Screen title | Outfit 800 | 30–44 |
| Big stat | Outfit 800 | 62–70 / 0.8 |
| Card title | Outfit 700 | 19–24 |
| Verse in card | Outfit 500 | 27 / 1.12 |
| Body | DM Sans 400 | 15–16 / 1.5 |
| Button | DM Sans 700 | 14–16 |
| Label | DM Sans 600 caps | 10–11 |

### Shape & spacing
- Screen horizontal padding **20px** (24 on Welcome/Login).
- Radii: cards **26–28**, small cards **20–22**, inputs **18**, chips/buttons **999 (pill)**, icon buttons circular 42–44.
- Card gap 10px. Shadows only on floating items (tab bar `0 12px 30px rgba(0,0,0,.25)`, stickers, FAB).
- Min hit target 44px.

## Components
- **Floating tab bar:** pill, 64px tall, 16px from sides, 20px from bottom, `solid` background. 5 items: Home, Bible, Prayer, Community, Reels. Inactive = white icon at 70% opacity. Active = `a2` pill with icon + label (`onA`).
- **Icon button:** 42–44 circle, `inset` bg, `ink` icon. Primary variant: `btn` / `btnText`. Lumen variant: `a1` / `onA` sparkles.
- **Primary button:** pill, `btn` bg, 17px vertical padding. Secondary: 1.5px `line` border, `ink` text.
- **Segmented control:** `inset` track, 4–5px padding; active segment = `card` with shadow (Login) or `btn` (Reels / Create).
- **Chip / filter:** pill; active `btn`, inactive `inset`.
- **Prayer row:** `inset` rounded 18. Done = `btn` circle check + strikethrough `subtle`. Next = 2px `ink` outline + `a1` time pill.
- **Story ring:** 62px, 3px `a1` ring (unseen) or `line` (seen), inner 3px `bg` gap.

## Screens (canvas order)
**Row 1**
1. **Welcome:** logo; tilted photo collage (angel, monstrance) with "12-day streak" sticker (`a2`) and verse sticker card; headline "Grow in faith, **every** day." (`a1` word); "Get started" + "I already have an account".
2. **Log in / Sign up:** back button; "Welcome **back.**"; segmented Log in / Sign up; filled inputs (focused = 2px `a1` border); Forgot password; primary Log in; Google / Apple.
3. **Home:** avatar + date + "Morning, Maria"; Lumen (a1) and bell buttons; verse card (`solid`) with Reflect (`a2`) and Share; 2-up Streak (`a2`) and Next up (`a4`) cards; Today's prayers card with progress bar and the next prayer; tab bar.
4. **Bible Reader:** back / "John 1 ▾" book picker / Aa / bookmark; label + Listen; "John 1" 64px; Newsreader text with `a1` verse numbers and `a2` highlight; floating selection toolbar (color dots, Note, Share, Explain in `a1`); prev / next pills.
5. **Prayer:** title + add; streak card (`a2`) with 7-day bars (`onA` = done, outlined = today); Today list; Guided cards scroll horizontally (`a3` / `a4` / `a5`).
6. **Community:** title + search + compose; story rings; filter chips; post cards (Prayer request tag `a6`, "I prayed" `a2`, replies); photo post.

**Row 2**
7. **Events:** back + Month view; "September **2026**" (300 weight); horizontal week strip (selected = `btn` + `a1` dot); feast photo card; event cards with time tile (`a2` / `a4`), Going check or RSVP.
8. **Lumen AI:** header with `a1` orb; user bubble (`solid`); assistant text with citation pills (`a3`); quote block (`a4`) + CCC chip; suggestion chips; input pill with mic + `a1` send.
9. **Profile:** handle + settings; tilted avatar tile (`a5`); stats (streak `a2`); badges; settings list with the **Appearance** toggle.
10. **Reels:** title + Following / For you; rounded video card (radius 32, 12px inset) with progress segments, action rail (like = `a1`, others glass), duration; caption block under the video (creator, Follow `btn`, title, audio, hashtag `a4`). Follows the theme.
11. **Discover:** search; chips; 2-col masonry of reels/photos + a trending hashtag card (`a2`); `a1` FAB (+) opens Create Post.
12. **Create Post:** camera preview (top 600px) with close, timer, Next (`a2`), side tools, gallery, record (`a1`), upload; bottom sheet (`card`) with Photo / Reel / Text, Add a verse (`a4`), Share to parish (`a3`), Audience.

## Behavior
- **Theme:** default follows system; override in Profile. Update tokens instantly with no restart.
- **Nav:** tab bar on Home, Bible (hide while reading on scroll), Prayer, Community, Reels, Discover. Lumen, Events, Profile, Create Post and Login are pushed / modal screens.
- **Bible:** long-press a verse to select and show the toolbar. Explain sends the verse to Lumen (bottom sheet). Highlights persist. Swipe for chapter.
- **Prayer:** tap a row to mark it done (with haptic). Streak = consecutive days with at least 1 prayer. Local notifications at scheduled times.
- **Community:** "I prayed" toggles count. Report / block on every post (app-store UGC requirement).
- **Reels:** vertical paging with snap; autoplay; tap to mute; double-tap to like; max 60s.
- **Lumen:** stream tokens; render Scripture / CCC citations as pills; the system prompt limits scope to Catholic teaching, forbids invented citations, and directs pastoral / crisis topics to a priest or appropriate help.

## Data model (suggested)
User, Prayer, PrayerLog, Highlight/Note, Post (text | request | photo | reel), Reaction, Comment, Group, Event, RSVP, LiturgicalDay, Conversation, Message (with citations[]).

## Assets
- `assets/angel.webp`: carved angel (Welcome, Events feast card, Discover)
- `assets/st-joseph.webp`: St. Joseph stained glass (Reels, Community)
- `assets/monstrance.jpg`: monstrance (Welcome, stories, Discover, Create Post)

These were supplied by the client (Unsplash). Confirm licenses before release.

## Files
- `Catalysis Mobile GenZ.dc.html`: all 12 mobile screens, with a light/dark toggle
- `Catalysis Web GenZ v2.dc.html`: web counterpart (7 screens), same tokens
- `support.js`: needed to open the `.dc.html` files locally
- `assets/`
