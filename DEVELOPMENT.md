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
packages/db          Prisma schema, migrations and the database client (Cloud SQL for PostgreSQL)
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

pnpm db:proxy        # connect to Cloud SQL on 127.0.0.1:5434 (keep it running while you work)
pnpm db:migrate       # apply pending migrations to the database (with the proxy running)
pnpm db:generate      # regenerate the Prisma client after editing the schema
pnpm db:studio        # browse the data
pnpm db:seed          # the starting list of trusted TikTok creators (there is no sample content)
pnpm db:moderator you@example.com   # make a member a moderator (add --remove to undo)

node scripts/import-nabre.mjs            # re-import the Bible text (pinned commit)
node scripts/import-catechism.mjs        # re-import the Catechism (pinned release, checked by SHA-256)
node --experimental-strip-types scripts/import-lectionary.mjs   # re-import the Mass reading citations (pinned commit)
```

With `DATABASE_URL` set, accounts are real: sign up in the app, and sign in on any device. Without
it the app runs on the device alone, and the demo account `maria.acosta@nyu.edu` (any password of
eight or more characters) is filled with the design's sample history.

## Configuration

| Variable | Where | Purpose |
|---|---|---|
| `GOOGLE_CLOUD_PROJECT` | `apps/web/.env.local`; Cloud Run | Turns on Gemini on Vertex AI for Lumen and caption screening. No key: the server signs in as Cloud Run's service account, or locally as your `gcloud auth application-default login`. Without it, Lumen streams a few scripted replies, labelled "Demo answer". |
| `GOOGLE_CLOUD_LOCATION` | optional | Vertex AI location, default `global` (where the newest Gemini models are served). |
| `LUMEN_GEMINI_MODEL`, `SCREENING_GEMINI_MODEL` | optional | Model overrides; defaults `gemini-3.8-flash` (Lumen) and `gemini-3.5-flash-lite` (screening). |
| `DATABASE_URL` | `apps/web/.env`; Cloud Run secret | Cloud SQL Postgres. On Cloud Run, the `catalysis-database-url` secret (through the `/cloudsql` socket); locally, the Cloud SQL Auth Proxy. |
| `ANTHROPIC_API_KEY`, `LUMEN_PROVIDER=anthropic`, `LUMEN_MODEL` | optional | Claude instead of Gemini. |
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

The database is Cloud SQL for PostgreSQL 17: instance `catalysis-db` in `catalysis-513617`
(us-east4, db-f1-micro, daily backups). It has a public address but no authorised networks, so the
only way in is the Cloud SQL Auth Proxy, which signs in with Google credentials. The app's password
lives only in Secret Manager (`catalysis-database-url`).

To work against it from your machine, start the proxy and point `DATABASE_URL` at it:

```bash
pnpm db:proxy   # cloud-sql-proxy --gcloud-auth --port 5434 catalysis-513617:us-east4:catalysis-db
```

`DATABASE_URL=postgresql://catalysis:<password>@127.0.0.1:5434/catalysis` (the password is in the
secret). To change the schema: edit it, run `pnpm --filter @catalysis/db migrate:new --name
<what-changed>`, review the SQL it writes, then `pnpm db:migrate` with the proxy running. Tables
keep row-level security enabled with no policies, a harmless leftover from Supabase.

`scripts/copy-database.mjs` copied the data from Supabase (`SOURCE_URL`, `TARGET_URL`); it refuses
to write into tables that already have rows and checks every count before committing.

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

## Readings at Mass

`/readings` shows the day's readings at Mass, with a card for the Gospel on Home.

- **Which readings:** citations from the Lectionary for Mass for the United States, in
  `packages/lectionary` (one file per year), imported from
  [acupofjose/catholic-readings-api](https://github.com/acupofjose/catholic-readings-api) (MIT) by
  `scripts/import-lectionary.mjs`, which checks that every citation can be read. Coverage ends where
  the source does (`LECTIONARY_RANGE`, currently 30 September 2027); re-run the import with a newer
  commit to extend it.
- **The text:** each reading is shown from the app's own NABRE (the translation the US Lectionary
  uses), so nothing is fetched from another site. `parsePassage` and `passageVerses` in
  `packages/api/src/readings.ts` read citations such as "Jonah 1:1–2:1-2, 11", and `cleanVerseText`
  takes out section titles left in the Bible text, psalm titles and "Selah".
- **What the app leaves to the USCCB:** the Lectionary's own wording (it differs slightly from the
  Bible's), the psalm refrain, the Gospel acclamation, partial verses ("26b" is shown whole), days with
  more than one Mass (Christmas, the Easter Vigil), and Esther's lettered chapters. Each day links to
  its page on bible.usccb.org.
- **Not used:** Universalis's free feed. Its terms limit it to free, public parish web pages and it
  serves only today's readings.

## Liturgy of the Hours

`/prayer/hours` shows the five hours (Office of Readings, Morning, Daytime, Evening and Night Prayer)
for any day from a month back to three months ahead.

- **Source.** The texts come from [iBreviary](https://www.ibreviary.com), which has no API: the server
  opens a session for the date on its mobile pages, checks the day page shows that date (iBreviary
  silently falls back to another day, sometimes 1 January 1970, when a date does not take), then
  reads and parses the hour (`apps/web/lib/server/ibreviary.ts`). Only text and three styles (rubric,
  italic, indent) are kept; none of iBreviary's HTML reaches the browser.
- **Caching.** Each hour of each day is fetched once and kept in the `HourText` table and in memory
  (`apps/web/lib/server/hours.ts`). `/api/hours` answers with a shared-cache header, so a CDN in front
  (Cloud CDN through a load balancer, for example) can serve repeats. iBreviary is sometimes slow (requests taking 30 seconds or more were seen), so the
  server tries three times and the page offers a retry and a link to iBreviary.
- **Feasts.** iBreviary's English mobile pages follow the seasons and the psalter but not always the
  calendar of saints: on 1 November 2026 it gives the Thirty-First Sunday, not All Saints. When the
  app's own calendar has a solemnity or feast the text does not seem to be for, the page says so
  (`sourceMissesCelebration` in `packages/api/src/hours.ts`).
- **Turning it off.** `HOURS_SOURCE=off` stops all requests to iBreviary; the page then links to it.
- **Rights.** The English texts are © ICEL and other rights holders. iBreviary publishes them for
  reading on its own site and apps; it has not given Catalysis permission to republish them. See
  "Not yet production-ready".

## Catechism

`/catechism` has the table of contents, a search over all 2,865 paragraphs, and a daily portion that
reads the whole Catechism in a year. `/catechism/<n>` opens the page holding paragraph *n* and
highlights it; footnotes link into the Bible reader. Lumen's "CCC" citations link here.

The text is in `packages/catechism` (one JSON file per page, loaded on demand), generated by
`scripts/import-catechism.mjs` from a scrape of vatican.va. §2267 carries the 2018 revision. See the
package README for the corrections the import makes.

## Prayer book and journal

- The **prayer book** is data: `packages/api/src/prayerbook.ts`. Each prayer is a list of steps, read
  as a page at `/prayer/book/[id]` or prayed one step at a time at `/prayer/guided/[id]`. To add a
  prayer, add it to a section there; ids must stay stable, since a member's rule and journal refer to them.
- The **journal** (`/prayer/journal`) is private to its writer. Entries are stored as plain text in
  the `JournalEntry` table, readable only through that member's session. They are not end-to-end
  encrypted: whoever administers the database can read them.

## Scripture by heart

Members learn passages by heart at `/memory`. A passage is added from the reader's verse toolbar (Memorize) or from a short list of suggestions, and its text is saved with it, so practice never waits on the Bible loading.

- **Learning** (`/memory/[id]`) runs in five steps: read it aloud, fill light gaps, fill heavy gaps, recite from first letters, then type it from memory. Typed recitations are checked word by word, ignoring case, punctuation and accents.
- **Review** (`/memory/review`) follows the Leitner method: a learned passage comes back after 1, 3, 7, 14, 30, 60 and 120 days, and goes back to the first box when it slips. From box 4 (two weeks) it counts as known by heart.

The scheduling, masking and checking live in `packages/api/src/memory.ts` and are covered by the tests. Passages sync as `memory.save` / `memory.delete` changes into the `MemoryVerse` table; ids are namespaced by member, as journal entries are.

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

## Deploying the web app (Cloud Run)

The app runs as the Cloud Run service `catalysis-web` (us-east4), built from the `Dockerfile` at the
repository root (a standalone Next.js server). It runs as the service account
`catalysis-web@catalysis-513617.iam.gserviceaccount.com`, which may connect to Cloud SQL
(`roles/cloudsql.client`), call Gemini (`roles/aiplatform.user`) and read the database secret, and
nothing else. To deploy:

```bash
gcloud run deploy catalysis-web --source . --project catalysis-513617 --region us-east4 \
  --service-account catalysis-web@catalysis-513617.iam.gserviceaccount.com \
  --add-cloudsql-instances catalysis-513617:us-east4:catalysis-db \
  --set-secrets DATABASE_URL=catalysis-database-url:latest \
  --set-env-vars GOOGLE_CLOUD_PROJECT=catalysis-513617,GOOGLE_CLOUD_LOCATION=global \
  --port 8080 --memory 1Gi --cpu 1 --max-instances 4 --concurrency 40 --allow-unauthenticated
```

`--max-instances 4` matters: each instance holds up to 5 database connections, and db-f1-micro
allows about 25. Raise both together. Run `pnpm db:migrate` (with the proxy) before deploying a
schema change: the deployment does not run migrations. `.dockerignore` and `.gcloudignore` keep
`.env` files out of the upload and the image.

The old Vercel deployment only forwards: `apps/web/vercel.json` redirects every path (307, query
string kept) to the Cloud Run URL. Update the destination if the service gets a custom domain.

## Not yet production-ready

These are deliberate placeholders, each behind a seam so it can be replaced without touching screens.

| Area | Today | To ship |
|---|---|---|
| Accounts | Email and password, in the database. No email is sent: there is no password reset or address confirmation. Google and Apple report that they are not set up. Attempt limits are kept in memory, per server instance. | Add an email provider for reset and confirmation; move limits to the edge or a shared store. |
| Data | In the database (web). Feeds load when the app opens, not live. The mobile app still keeps its data on the device. | Realtime feeds; point the mobile app at the API. |
| Media | Photos are kept in the database (web). Members' own reels stay on the device that recorded them, so others cannot play them. | Move photos to object storage; upload and transcode reels (Mux or Cloudflare Stream). |
| Bible text | The NABRE, imported from a public scrape (`packages/bible-nabre`). It is under copyright, poetry has lost its line breaks, and there are no footnotes. The design's copy names the RSV-CE. | Obtain permission from the copyright holder (CCD, through the USCCB), or license another translation and register its loader with `setBibleSource`. Prefer a licensed feed over the scrape for quality. |
| Lumen | Gemini on Vertex AI. Needs a session, with a per-member limit kept in memory. A new project can meet Vertex AI's shared-capacity limits (429), which Lumen shows as "busy". | Set a budget alert in Cloud Billing; request provisioned throughput if 429s persist. |
| Moderation | Reports are stored. TikTok videos have a review screen; posts and members' own reels do not yet. | A review screen for reported posts. |
| Prayer book | Traditional English texts, typed in by hand. | Have the texts checked by someone competent before release. |
| Images | The three photographs were supplied with the design. | Confirm their licences. |
| Liturgy of the Hours | Fetched from iBreviary's web pages without an agreement. On some feasts the text is the weekday's. | Ask iBreviary for permission, or license the texts (ICEL, through the USCCB; or a publisher such as Universalis or Catholic Book Publishing). Set `HOURS_SOURCE=off` until then if needed. |
| Catechism | The Libreria Editrice Vaticana / USCCB translation, from a scrape. | Obtain permission from the USCCB (United States edition) or the Libreria Editrice Vaticana. |
