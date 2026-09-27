# Catalysis — development guide

There are two designs, and each app follows one of them:

| App | Design | File |
|---|---|---|
| Web (`apps/web`) | **Gen Z v2**: bento cards, Outfit + DM Sans, light and dark themes | `design/Catalysis Web GenZ v2.dc.html` |
| Mobile (`apps/mobile`) | **Gen Z mobile**, in progress: the theme, component kit, tab bar and the Welcome, Login and Home screens are done; the other screens still use the editorial look through compatibility shims | `design/mobile/`, kit notes in `apps/mobile/KIT.md` |

Open a design file in a browser with `support.js` beside it. This file covers the code.

## Layout

```
apps/web            Next.js 16 (App Router) — desktop layouts, and the mobile layouts below 768px
apps/mobile         Expo SDK 57 + Expo Router — iOS and Android
packages/api        Shared types, demo content, business logic and the app store (zustand)
packages/ui-tokens  Design tokens for both designs; `tokens.css` (editorial) and `genz.css` are generated from `src/index.ts`
packages/db          Prisma schema, migrations and the database client (Supabase Postgres)
packages/bible-nabre  The reader's text (NABRE), one JSON file per book, loaded on demand
scripts/            import-nabre.mjs (Bible text)
```

Both apps consume the packages as TypeScript source, so there is no build step between them.

## Commands

```bash
pnpm install
pnpm dev:web          # http://localhost:3000
pnpm dev:mobile       # Expo dev server; press i / a, or scan the QR code with Expo Go
pnpm typecheck        # all workspaces
pnpm test             # unit tests for packages/api
pnpm tokens           # regenerate packages/ui-tokens/tokens.css after editing tokens
pnpm build:web

pnpm db:migrate       # apply pending migrations to the database (uses DIRECT_URL)
pnpm db:generate      # regenerate the Prisma client after editing the schema
pnpm db:studio        # browse the data
pnpm db:seed          # groups, events, trusted TikTok creators and the sample community
pnpm db:moderator you@example.com   # make a member a moderator (add --remove to undo)

node scripts/import-nabre.mjs            # re-import the Bible text (pinned commit)
```

With `DATABASE_URL` set, accounts are real: sign up in the app, and sign in on any device. Without
it the app runs on the device alone, and the demo account `maria.acosta@nyu.edu` (any password of
eight or more characters) is filled with the design's sample history.

## Configuration

| Variable | Where | Purpose |
|---|---|---|
| `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` | `apps/web/.env` | Lets Lumen answer with a model. With neither, Lumen streams a few scripted replies, labelled "Demo answer". |
| `DATABASE_URL`, `DIRECT_URL` | `apps/web/.env` | Supabase Postgres: the pooled connection for the app, and the session connection for migrations. |
| `LUMEN_MODEL` | `apps/web/.env.local` | Optional model override (default `claude-opus-5`). |
| `SCREENING_MODEL`, `SCREENING_OPENAI_MODEL` | `apps/web/.env.local` | Optional model for screening TikTok captions. Defaults to Lumen's model. |
| `EXPO_PUBLIC_API_URL` | `apps/mobile/.env` | Base URL of the web app, so the mobile app can reach `/api/lumen`. Without it the mobile app uses the scripted replies. |

## How the pieces fit

- **State** lives in one store, `packages/api/src/store.ts`, persisted to `localStorage` on web and
  `AsyncStorage` on mobile. Every action there corresponds to one write in the handoff's data model.
- **Dates** are real. The demo account's history is laid out relative to the day it is first
  opened, so it always shows a 12-day streak with three of four prayers done.
- **Liturgical calendar** is computed in `packages/api/src/liturgical.ts` (General Roman Calendar,
  US conventions, Ascension on Thursday).
- **Bible text** comes from whatever loader the app registers with `setBibleSource`
  (`packages/api/src/bible/text.ts`). Both apps register `@catalysis/bible-nabre`. The import
  script separates section headings from verse text; the web app fetches a book as its own chunk
  when it is first opened, and the mobile app bundles all 73 so Scripture works offline.
- **Themes (web).** The palette is CSS variables under `[data-theme]` (`packages/ui-tokens/genz.css`).
  A script in `<head>` applies the saved theme before first paint, falling back to the system setting;
  `useTheme()` in `apps/web/lib/theme.tsx` switches it. Never hard-code a themed colour in a component.
- **Lumen** streams newline-delimited JSON from `apps/web/app/api/lumen/route.ts`. The wire format
  and its parser are in `packages/api/src/lumen/protocol.ts`; the instructions given to the model
  are in `apps/web/lib/server/lumen-prompt.ts`.

## Database

The schema is `packages/db/prisma/schema.prisma`; the connection strings are in `apps/web/.env`
(`DATABASE_URL` for the app, through the transaction pooler; `DIRECT_URL` for migrations). To change
the schema: edit it, run `pnpm --filter @catalysis/db migrate:new --name <what-changed>`, review the
SQL it writes, then `pnpm db:migrate`. Every table has row-level security enabled with no policies,
which closes Supabase's public Data API; add `ENABLE ROW LEVEL SECURITY` for each new table.

The web app reads and writes the database through its own API, never from the browser directly:

| Route | What it does |
|---|---|
| `POST /api/auth/signup`, `/login`, `/logout`; `GET /api/auth/me` | Accounts. Passwords are hashed with scrypt; the session is an httpOnly cookie, and only its SHA-256 is stored. |
| `GET /api/state` | Everything the app shows the signed-in member. |
| `POST /api/sync` | `{ changes }`: the member's changes, validated with zod (`apps/web/lib/server/changes.ts`) and applied in order. |
| `POST /api/lumen` | Lumen. Needs a session; thirty questions per member per ten minutes. A demo visitor gets a few short answers a day instead. |
| `POST /api/uploads`, `GET /api/uploads/:id` | Photos (portraits, pictures on posts): JPEG, PNG or WebP up to 1.5 MB, kept in the `Upload` table and served to signed-in members. |
| `GET /api/demo` | What the demo may show of the real app: the approved TikTok videos. |
| `GET`/`POST /api/reels/tiktok`, `/review`, `/creators` | TikTok videos in Reels (below). |

The store emits a `Change` for every action (`packages/api/src/sync.ts`); `apps/web/lib/remote.ts`
queues them in `localStorage` and posts them in batches, so nothing is lost offline.

## Members, followers and groups

- `GET /api/state` carries a **directory** of members (`people`, up to 300: everyone the member
  follows or is followed by, then the most followed), who follows them (`followerIds`), and every
  **group** with its member count. A member's page (`/profile/<id>`) is drawn from these and from
  the posts in the feed, so it shows only their recent posts.
- Counts sent to a member leave that member out (`followerCount`, `memberCount`); the app adds
  their own follow or membership on top, so a tap shows at once.
- Any member can **start a group** (`group.create`): up to ten each, names unique. Its founder can
  close it (`group.delete`); posts made in it stay in the feed. Groups are open: anyone can join,
  and posts in a group are seen by everyone.
- **Milestones** on the profile are worked out from what the member has done
  (`milestonesFor` in `packages/api/src/store.ts`), not stored.

## The demo account

`/demo` opens the sample account (Maria) with no sign-up. Everything a visitor does stays in their
browser: nothing is written to the database, and no member can see it. The one thing that reaches
the server is Lumen, which is limited for visitors:

| Variable | Default | Meaning |
|---|---|---|
| `DEMO_LUMEN_TOKENS` | `100` | The most tokens Lumen may spend on one demo answer. |
| `DEMO_LUMEN_QUESTIONS` | `5` | Answers one visitor may have in a day. `0` turns Lumen off in the demo. |
| `DEMO_LUMEN_DAILY_TOTAL` | `300` | Answers all visitors together may have in a day. |

The counts are kept in the `Allowance` table against a salted hash of the visitor's address.

## Prayer book and journal

- The **prayer book** is data: `packages/api/src/prayerbook.ts`. Each prayer is a list of steps, read
  as a page at `/prayer/book/[id]` or prayed one step at a time at `/prayer/guided/[id]`. To add a
  prayer, add it to a section there; ids must stay stable, since a member's rule and journal refer to them.
- The **journal** (`/prayer/journal`) is private to its writer. Entries are stored as plain text in
  the `JournalEntry` table, readable only through that member's session. They are not end-to-end
  encrypted: whoever administers the database can read them.

## TikTok videos in Reels

Videos are never downloaded or re-hosted. A video is looked up through TikTok's oEmbed endpoint and
played in TikTok's embed player (`https://www.tiktok.com/player/v1/<id>`), which the feed drives
with the documented `postMessage` API. Nothing of ours is drawn over the player.

Only Christian and Catholic videos are shown. A video gets into Reels in one of two ways:

1. It comes from a **trusted creator** and its caption passes screening, or
2. a **moderator** approves it in Reels → Review.

A member's suggestion always waits for a moderator. Screening (`apps/web/lib/server/screening.ts`)
reads only the caption and creator, with the configured model or a word list, so it can be fooled:
moderators should watch a video before approving it. Members can report any video, which hides it
for them and lists it for the moderators. Make yourself a moderator with `pnpm db:moderator <email>`.

TikTok's player sets its own cookies and is subject to TikTok's terms; say so in the privacy policy.

## Deploying the web app (Vercel)

1. Commit and push the repository to GitHub (`.env` files are ignored and must stay out of it).
2. Import it at vercel.com/new. Set **Root Directory** to `apps/web`, and leave "Include files
   outside the root directory" on: the app uses the packages beside it. Leave the build and install
   commands at their defaults; the build generates the Prisma client itself.
3. Add the environment variables from `apps/web/.env` (Production and Preview): `OPENAI_API_KEY`,
   `DATABASE_URL` (the pooled connection, port 6543) and `DIRECT_URL`.
4. Deploy. Later pushes to `main` deploy automatically.
5. After a change to the schema, run `pnpm db:migrate` from your machine before deploying: the
   deployment does not run migrations.

If the install step fails on the pnpm version, add `ENABLE_EXPERIMENTAL_COREPACK=1` to the
environment variables, which makes Vercel use the version named in `package.json`.

## Not yet production-ready

These are deliberate placeholders, each behind a seam so it can be replaced without touching screens.

| Area | Today | To ship |
|---|---|---|
| Accounts | Email and password, in the database. No email is sent: there is no password reset or address confirmation. Google and Apple report that they are not set up. Attempt limits are kept in memory, per server instance. | Add an email provider for reset and confirmation; move limits to the edge or a shared store. |
| Data | In the database (web). Feeds load when the app opens, not live. The mobile app still keeps its data on the device. | Realtime feeds; point the mobile app at the API. |
| Media | Photos are kept in the database (web). Members' own reels stay on the device that recorded them, so others cannot play them. | Move photos to object storage; upload and transcode reels (Mux or Cloudflare Stream). |
| Bible text | The NABRE, imported from a public scrape (`packages/bible-nabre`). It is under copyright, poetry has lost its line breaks, and there are no footnotes. The design's copy names the RSV-CE. | Obtain permission from the copyright holder (CCD, through the USCCB), or license another translation and register its loader with `setBibleSource`. Prefer a licensed feed over the scrape for quality. |
| Lumen | Needs a session, with a per-member limit kept in memory. | Set a spending limit with the model provider. |
| Moderation | Reports are stored. TikTok videos have a review screen; posts and members' own reels do not yet. | A review screen for reported posts. |
| Prayer book | Traditional English texts, typed in by hand. | Have the texts checked by someone competent before release. |
| Images | The three photographs were supplied with the design. | Confirm their licences. |
