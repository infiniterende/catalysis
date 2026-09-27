# Handoff: Catalysis — Catholic web app & mobile app

## Overview
Catalysis is a Catholic companion app for young adults / college Catholics. It combines a Bible reader (RSV-CE), a prayer guide & tracker, a community feed (posts, prayer intentions), short-form social (reels + photo posts), events & a liturgical calendar, user profiles, and **Lumen**, an AI assistant that answers questions about Scripture and the Catechism and suggests prayers.

Two targets:
- **Mobile app** (iOS + Android) — 12 screens, 390×844 reference frame.
- **Web app** (desktop, responsive) — 7 screens, 1320px reference width.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing the intended look, content and layout. They are **not production code to copy**. The task is to **recreate these designs in a real codebase** using its established patterns. There is no existing codebase, so a recommended stack is given below.

`Catalysis App v2.dc.html` is a single canvas holding every screen as an absolutely-positioned frame. Open it in a browser (it needs `support.js` beside it and loads Google Fonts + Lucide from CDNs). Each frame has a label above it (e.g. "Prayer Guide & Tracker — desktop"). Inline styles in the HTML are the source of truth for exact values.

## Fidelity
**High-fidelity.** Colors, typography, spacing, borders and copy are final. Recreate pixel-accurately. Interactions are not prototyped — behavior is specified in this README.

## Recommended Stack (greenfield)
- **Monorepo** (Turborepo or pnpm workspaces):
  - `apps/web` — Next.js (App Router) + TypeScript
  - `apps/mobile` — Expo (React Native) + Expo Router + TypeScript
  - `packages/ui-tokens` — shared design tokens (colors, type, spacing) consumed by both
  - `packages/api` — shared types + data client
- **Backend:** Supabase (Postgres, Auth with Google/Apple/email, Storage for photos & video, Realtime for feeds) — or equivalent.
- **Video:** Mux or Cloudflare Stream for reel upload/transcoding/HLS playback; `expo-camera` + `expo-av`/`expo-video` on mobile.
- **AI (Lumen):** Claude API, called server-side only (Next.js route handler / edge function). Never ship the API key to clients.
- **Icons:** `lucide-react` / `lucide-react-native`, stroke width **1.5**.
- **Bible text:** RSV-CE is under copyright (National Council of Churches / Ignatius Press). Obtain a license or use an API that licenses it; the design copy uses RSV-CE John 1:1–5.

## Design Tokens

### Colors
| Token | Hex | Use |
|---|---|---|
| `ink` | `#0E0E0E` | Primary text, rules, black buttons, active boxes |
| `black` | `#0B0B0B` | Dark sections (issue bar, verse card, reels, create) |
| `paper` | `#F5F2EC` | Default app background (cream) |
| `paperReader` | `#FBFAF7` | Bible reader background |
| `white` | `#FFFFFF` | Desktop top nav, landing page, input cards |
| `crimson` | `#A8141B` | Accent: labels, numerals, active tab, drop cap, record button |
| `crimsonTint` | `#EFD3CF` | Scripture highlight (as lower 42% underline) |
| `crimsonOnDark` | `#F0B3B5` | Crimson-family text on black |
| `muted` | `#5A5750` | Secondary text |
| `subtle` | `#8C877E` | Tertiary text, timestamps, placeholders |
| `disabled` | `#C4BEB3` | Out-of-month dates, locked items |
| `strike` | `#B8B2A7` | Strikethrough color on completed prayers |
| `rule` | `#D9D4CA` | Hairline dividers between list rows |
| `ruleSoft` | `#E4DFD5` | Very light rules (bible book list) |
| `onDarkMuted` | `#CFCAC0` | Secondary text on black |
| `onDarkBody` | `#E4E0D8` / `#ECE8E0` | Italic deck/sub copy on photos |
| `darkPanel` | `rgba(22,22,21,.88)` | Landing hero sidebar |
| `sheet` | `#161615` | Bottom sheet on Create Post |

Rule of thumb: **section tops use a 1px `ink` rule; rows inside use 1px `rule`.**

### Typography
Three families (Google Fonts):
- **Bodoni Moda** (`dd`) — display headlines, italics, numerals, masthead. Weights 400–500. Italic used heavily for page titles ("Prayer", "Community", "Good morning, Maria.").
- **Libre Caslon Text** (`ct`) — body copy, list items, titles (700 for story/feature titles), italic for decks/placeholders.
- **Hanken Grotesk** (`lb`/`sn`) — UI labels. Labels are **UPPERCASE, letter-spacing 0.22em, weight 500** (600–700 when active/emphasized). Also status bar time.

Scale used:
| Role | Family | Size / line-height | Notes |
|---|---|---|---|
| Masthead (desktop) | Bodoni | 34px (landing) / 28px (app), ls .36em | "CATALYSIS" |
| Masthead (mobile) | Bodoni | 19–22px, ls .34em | |
| Hero headline desktop | Bodoni 500 | 112px / .95, ls -.015em | |
| Hero headline mobile | Bodoni 500 | 58px / .98 | |
| "Contents" | Bodoni italic | 108px / 1 | |
| Page title desktop | Bodoni italic | 52–96px | |
| Page title mobile | Bodoni italic | 36–54px / 1 | |
| Verse (card) | Bodoni 400 | 25px mobile / 40px desktop, lh 1.2 | on black |
| Large numerals | Bodoni | 24–52px, crimson | "01", "02"… |
| Stat numerals | Bodoni | 30–46px | |
| Story/feature title | Caslon 700 | 21–22px / 1.3–1.35 | |
| Body | Caslon 400 | 15–18px / 1.55–1.65 | |
| Scripture | Caslon 400 | 17.5px mobile / 21px desktop, lh 1.78–1.8 | |
| Deck / subhead | Caslon italic | 15–26px / 1.45–1.5 | |
| Label | Hanken 500 caps | 8–11px, ls .22em (.1–.16em when tiny) | |

### Spacing, radii, shadows
- Mobile horizontal page padding **22px** (20–28px on some screens). Desktop page padding **36px**; column gaps **40–48px**.
- List rows: 10–16px vertical padding.
- **Border radius: 0 everywhere** (square editorial look). Exceptions: record button & ring (circles), device frame.
- Borders: 1px ink for outline buttons and section rules; 1.5–2px for active tab underline (crimson on content tabs, ink on login tabs).
- No card shadows. Only the floating "+" button on Discover has `0 8px 20px rgba(0,0,0,.25)`.

### Components
- **Label box (tag):** Hanken caps 9–11px, padding 5–9px × 8–14px, crimson bg + white text ("Cover story", "Prayer request", "Verse of the day", "Tonight").
- **Primary button:** ink bg, paper text, Hanken caps 11px 600, padding 16–18px. On dark: paper bg, black text.
- **Outline button:** 1px ink border, ink text, same type.
- **Text link action:** Hanken caps with 1px bottom border ("Reflect", "Read & reflect").
- **Numbered row:** crimson Bodoni numeral (fixed width 26–44px) + Caslon title + right-aligned Hanken caps meta.
- **Tab bar (mobile):** 76px tall, paper bg, 1px ink top border, 5 equal columns: Today (sun), Scripture (book-open), Prayer (flame), Community (users), Reels (clapperboard). Icon 20px + caps label 8px. Active = crimson + weight 700. On Reels, tab bar is black with white active / `#8C877E` inactive.
- **Top nav (desktop):** white, 3-column grid (left links / centered masthead / right links + search + avatar square 36px ink with Bodoni initial). Active link has 2px crimson underline, 5px offset. Left: Today, Scripture, Prayer, Community, Reels. Right: Events, Ask Lumen.
- **Sub bar (desktop app):** 3-col grid of caps labels below nav — date / liturgical memorial (crimson) / streak.
- **Photo treatment:** full-bleed `background-size: cover`, dark gradient scrims (`linear-gradient(transparent → rgba(0,0,0,.75–.85))`) behind any text on images.

## Screens — Mobile (390×844)
Status bar 50px on all screens. Order below matches the canvas left→right.

1. **Home / Landing (pre-login)** — black. Centered masthead, issue bar ("Nº 09 — Sept 2026" / "A.M.D.G."), full-bleed angel photo (660px). Over photo, bottom-anchored: tag "Est. 2026" + "Faith", headline "Grow in faith, every day.", italic deck, buttons "Begin — it's free" (paper) and "Log in" (outline white).
2. **Log in / Sign up** — paper. Masthead with ink rule; "Members" crimson label; "Welcome back." Bodoni italic 54; tabs Log in / Sign up; underline-only inputs (Email, Password with "Show"); "Forgot password?"; black "Log in" button; "or"; Google / Apple outline buttons; "New here? Create an account".
3. **Dashboard (Today)** — search · masthead · chat icon (opens Lumen). Liturgical sub-bar. Greeting "Good morning, Maria." Black verse card (tag, verse, ref, "Reflect"). "Today's rule 3 / 4" with 4 numbered rows; completed rows strike-through in `subtle`; next row bold with black time chip.
4. **Bible Reader** — `paperReader` bg. Header: back / "John · I" + edition / type + bookmark. "The Gospel according to" crimson label, "John" 52px, chapter label with ink rule, scripture with **crimson Bodoni drop cap** (74px), crimson superscript verse numbers, highlighted phrase. Black selection toolbar: Highlight · Note · Explain · Share. Bottom pager: ‹ Luke 24 · Contents · John 2 ›.
5. **Prayer Guide & Tracker** — "Prayer" title; 7-day bar row (done = solid ink, today = crimson outline partially filled, future = rule outline); 3 stats (Day streak crimson, Today 3/4, All time); checklist rows with square checkboxes; "Begin →" crimson on next; "Guided" list with Roman numerals.
6. **Community** — title + search/bell; tabs For you / Newman Center / Intentions; compose row; posts: name caps, meta, optional crimson "Prayer request" tag, Caslon body, optional Bodoni italic pull quote + photo; actions "I prayed · N" (crimson when active), "Reply · N", "Share".
7. **Events & Calendar** — "September 2026", arrows; 7-col month grid (Sept 2026 starts Tuesday); feast days in crimson bold; today underlined; selected date solid ink square. Selected-day header + feast name in crimson italic. Event rows: crimson time numeral, title, location, "Going" (filled) / "RSVP" (outline).
8. **AI Chat (Lumen)** — header: back / "Lumen" + "Scripture & Catechism" / more. User message = black block, right-aligned. Assistant = no bubble: crimson "LUMEN" label, Caslon body, quote block with 2px crimson left rule + Bodoni italic + citation label; actions Copy · Save · Sources; suggested replies as outline chips. Composer: ink top rule, italic placeholder, black square send.
9. **User Profile** — portrait (104×130), name Bodoni 32, handle/parish; favorite quote with crimson quote marks + attribution; 3 stats; Milestones numbered list (in-progress one greyed with crimson "18 / 30"); "Saved verses & notes ›".
10. **Reels** — full-bleed vertical media (St. Joseph image as sample), Following / For you tabs, right rail (creator square, like, comment, save, share with counts), caption block (name, Follow, Bodoni title, italic sub, crimson category tag, audio). Dark tab bar.
11. **Discover** — "Discover" + search; tabs Reels / Photos / People; 2-column masonry, 3px gutters, tiles with play/photo icon and gradient caption (Bodoni title + caps meta). Floating crimson square "+" (54px) bottom-right → Create Post.
12. **Create Post** — black. Cancel / "New post" / crimson "Next". Camera preview (440px) with flash, flip, timer, music; timer "0:00 / 1:00"; gallery thumb, record button (76px white ring + 56px crimson disc), upload. Mode tabs Photo / **Reel** / Text. Bottom sheet: "+ Add a verse", "Share to parish", Audience · Everyone ›.

## Screens — Web (1320 wide)
13. **Home / Landing** — white nav, black issue bar, 720px angel hero with tag, 112px headline, italic deck, two buttons; right dark panel (400px) with 3 stacked stories (label + Caslon 700 22px title, separated by white 28% rules). Below: "IN THIS APP / Contents" left column (420px) + 2-col numbered grid of six features (crimson 52px numerals).
14. **Dashboard** — nav (Today active), sub bar; grid `1.45fr 1fr`: greeting 64px + black verse card (verse 40px) + two "Continue reading" / "From the community" teasers; right: Today's rule list (34px numerals) + Next up event.
15. **Bible Reader** — 3 columns `250px | 1fr | 330px`: book list (active book bold with crimson chapter numeral) / reading column (max 640px, "John" 88px, drop cap 104px) / study panel (Lumen explains, Cross references, Highlight + Add note).
16. **Prayer** — grid `1fr 1fr 380px`: title + week tracker + stats / Today's rule checklist + "Add prayer" + Guided prayers (Roman numerals) / tall rosary photo card with "Tonight" tag, "The Glorious Mysteries", "Begin · 20 min · Audio".
17. **Events & Calendar** — grid `1fr 400px`: month title with Month/List toggle, full 7-col calendar (98px rows, hairline cells, feast names in crimson italic, events as small black-filled or outlined tags, selected day solid black) / angel image header for the selected feast, day's events with RSVP, "Coming in October" list.
18. **Community** — grid `240px | 1fr | 320px`: title + Feeds + Your groups / compose bar + feed (text post, photo post with image at right 220px) / "Intentions this week" numbered with "N praying" + black "Group spotlight" card with Join.
19. **Lumen AI** — grid `270px | 1fr | 300px` under nav: "+ New conversation" + history list (active in crimson) / centered thread (max 660px) + composer bar pinned to bottom / "Sources in this answer" list (type label, reference, italic description) + disclaimer.

## Interactions & Behavior
- **Auth:** email/password + Google + Apple. Validate email format; password min 8. Errors show below the field in crimson Hanken 11px. Landing "Begin" → Sign up; "Log in" → Log in tab.
- **Navigation:** mobile tab bar persists on all authed screens except Bible Reader (own pager), AI Chat and Create Post (full-screen). Chat icon on Today → Lumen. Desktop top nav mirrors tabs; Events & Ask Lumen on the right.
- **Bible:** tap/long-press a verse to select → black toolbar. Highlight saves a range (rendered as `crimsonTint` lower-42% band). Note opens editor. **Explain** sends the verse to Lumen and shows the answer in the study panel (desktop) or a bottom sheet (mobile). Swipe/pager changes chapter. Type settings: size, line spacing.
- **Prayer tracker:** tapping a checkbox marks complete + timestamp; completed rows strike through. Streak = consecutive days with ≥1 completed prayer (tweakable). Reminders via local notifications at each prayer's scheduled time.
- **Community:** "I prayed" toggles (count ±1, crimson when on). Replies thread. Post types: reflection, prayer request (tag), photo. Report/block on every post (required for app-store UGC rules).
- **Reels:** vertical paging with snap; autoplay muted-by-default with tap to unmute; double-tap to like. Uploads ≤ 60s. Moderation queue before public distribution is recommended.
- **Create Post:** hold/tap record; pick from gallery; "Add a verse" attaches a scripture reference card; audience: Everyone / Parish / Followers.
- **Events:** month navigation; tap a date to show its events; RSVP toggles Going ↔ RSVP; add to device calendar.
- **Lumen AI:**
  - Stream responses. Every answer should cite sources (Scripture refs and CCC paragraph numbers) returned as structured data to render the quote block and the Sources panel.
  - System prompt should restrict scope to Catholic teaching, cite sources, avoid inventing citations, and direct pastoral/confessional/medical/crisis topics to a priest or appropriate help. Show the disclaimer on desktop and in chat settings on mobile.
  - Suggested follow-ups returned as 2–3 short strings → outline chips.
- **States:** skeletons use `rule` blocks (square). Empty states in Caslon italic `muted`. Hover (web): links → crimson; outline buttons → ink fill with paper text; rows → `#FFFFFF` background.
- **Responsive web:** below ~1024px collapse side columns under the main column; below 768px use the mobile layouts.

## State / Data Model (suggested)
- `User` (name, handle, parish, portrait, quote, stats)
- `Prayer` (title, scheduledTime, guidedContentId) · `PrayerLog` (userId, prayerId, completedAt)
- `Highlight` / `Note` (userId, book, chapter, verseStart, verseEnd, text)
- `Post` (type: reflection | request | photo | reel, body, mediaUrl, groupId, audience) · `Reaction` ("prayed", like) · `Comment`
- `Group` / `Membership`
- `Event` (title, start, location, groupId) · `RSVP`
- `LiturgicalDay` (date, celebration, rank) — from a liturgical calendar source
- `Conversation` / `Message` (role, content, citations[])

## Assets
- `assets/angel.webp` — B&W carved angel in a basilica vault (landing heroes, Feast of the Archangels, Discover tile).
- `assets/st-joseph.webp` — stained glass of St. Joseph with the Child (Reels sample, Discover, Community post).
- `assets/rosary.jpg` — silver crucifix/rosary on lace (Prayer feature card, Community post, Discover).
Supplied by the client; confirm licensing (likely Unsplash) before production.
- Portrait and camera preview are placeholders.
- Icons: Lucide (`signal, wifi, battery-full, search, message-square, sun, book-open, flame, users, clapperboard, chevron-left/right, type, bookmark, check, pen-line, bell, heart, message-circle, send, plus, image, play, zap, switch-camera, timer, music, upload, arrow-up, more-horizontal, settings, share`).

## Files
- `Catalysis App v2.dc.html` — every screen (open in a browser; frames are labeled). Mobile frames are on the top row, desktop frames on the second row.
- `support.js` — runtime needed to open the HTML file locally.
- `assets/` — images.
