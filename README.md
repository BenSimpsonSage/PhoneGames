# Party Box

A pocket arcade of party games for family game night. One phone, passed around
the room — no accounts, no servers, no internet needed once it's loaded.

Built as an installable web app (PWA): open it on a phone, tap **Add to Home
Screen**, and it gets its own icon and launches fullscreen with no browser
chrome, like an App Store app.

## The games

| Game | Players | How it plays |
| --- | --- | --- |
| **Heads Up** | 3+ | Phone on your forehead. Tilt down when you get it, up to pass. Buttons work too. |
| **Imposter** | 4+ | Everyone secretly sees the same word — except one player, who only sees the category. Talk, then point. |
| **Would You Rather** | 2+ | Two options. Everyone votes secretly as the phone goes round, then the split is revealed. |
| **Most Likely To** | 3+ | Read it out, count to three, everyone points. Running scoreboard. |
| **Categories** | 2+ | A topic and a random letter. Go round the circle before the buzzer. |
| **Doodle Dash** | 3+ | Draw the word on screen while everyone shouts guesses. Takes turns picking an artist. |

## Difficulty

Every deck is written across three tiers, set once in **Settings** on the home
screen:

- **Little Kids** — words a four-year-old knows
- **Family** — the default; mixes in the easy stuff so the pool stays big
- **Tricky** — harder words for older kids and grown-ups

Choosing a tier includes the one below it, so the pool never gets thin, but the
grown-ups' game never serves up toddler words.

## Running it locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000. To try it on a real phone on the same wifi,
run `npm run dev -- -H 0.0.0.0` and visit your computer's local IP on port 3000.

Note that the tilt controls in Heads Up and the "Add to Home Screen" prompt only
do anything on an actual phone.

```bash
npm run build   # production build
npm run lint    # eslint
```

## Adding new words

This is the bit you'll do most. All the content lives in [`src/data/`](src/data/)
as plain lists — no database, no admin screen. Each entry is tagged with the
difficulty tier it belongs to.

```ts
// src/data/heads-up.ts
t("Hedgehog", "family"),
t("Platypus", "tricky"),
```

| File | Feeds |
| --- | --- |
| `src/data/heads-up.ts` | Heads Up packs |
| `src/data/imposter.ts` | Imposter packs |
| `src/data/would-you-rather.ts` | The dilemmas |
| `src/data/most-likely-to.ts` | The prompts |
| `src/data/categories.ts` | Category topics |
| `src/data/doodle.ts` | Drawing words |

Add a line, save, and it's in the game. A whole new pack is a new object in the
category array with an `id`, `name`, `emoji` and `entries`.

## Adding a new game

1. Add an entry to `GAMES` in [`src/lib/games.ts`](src/lib/games.ts) — this is
   what draws the home screen tile.
2. Create `src/app/<your-id>/page.tsx` matching the `href` you used.
3. Reuse the shared pieces: `GameShell`, `Button`, `TimerRing`, `GetReady`,
   `CategoryPicker`, and the `useCountdown` / `useWakeLock` hooks.

## Renaming the app

Everything user-facing comes from [`src/lib/app-config.ts`](src/lib/app-config.ts) —
the title, the install name, the tagline. Change it there and the home screen,
the browser tab and the home-screen icon label all follow.

## How it's put together

- **Next.js 16** (App Router) + **React 19** + **Tailwind 4**, all TypeScript.
- **Every page is static.** There is no backend, no database and no API. Nothing
  a child does in the app leaves the phone.
- **State lives in `localStorage`** — the player list, difficulty, and each
  game's settings — read through `usePersistentState`, which uses
  `useSyncExternalStore` so it survives server rendering cleanly.
- **Sound is synthesised** in the browser with the Web Audio API
  ([`src/lib/sound.ts`](src/lib/sound.ts)), so the app ships no audio files.
- **Icons are generated at build time** from `src/app/icon.tsx` — no binary
  assets to keep in sync.
- **A service worker** ([`public/sw.js`](public/sw.js)) caches the app so it
  opens with no signal. Pages are network-first (so a deploy is picked up as
  soon as there's wifi); fingerprinted assets are cache-first.

## Deploying

Pushed to GitHub and connected to Vercel — every push to `main` deploys itself.
There is nothing to configure: no environment variables, no database, no build
settings beyond the defaults Vercel detects for Next.js.
