# World Cup 2026 Pool — Project Overview & Handoff

A handoff guide for any developer or AI agent picking up this project. It
explains what the app is, how it's built, where everything lives, the
conventions to follow, and the gotchas to avoid.

> For end-user/setup basics see [`../README.md`](../README.md) and the backend
> setup in [`../../apps-script/SETUP.md`](../../apps-script/SETUP.md). This file
> is the deeper engineering reference.

---

## 1. What it is

A web app for a FIFA World Cup 2026 **prediction pool**. Participants paid a $50
entry and submitted picks (who wins each game) ahead of time. The app:

- **Leaderboard (`/`)** — everyone ranked by points. Tap a row to expand that
  person's picks vs. the recorded results.
- **Schedule (`/schedule`)** — all 104 matches grouped by day (times shown in
  Pacific). Knockout teams fill in as the bracket is decided.
- **My Picks (`/my-picks`)** — a participant types their full name and sees all
  of their own picks, grouped by stage, with correct/wrong/pending status and a
  points summary.
- **Admin (`/admin`)** — passcode-gated. Enter match results and choose the two
  teams for each knockout matchup. Saves instantly to a Google Sheet.

### Scoring

Picks are worth more in later rounds (per the pool flyer):

| Stage        | Points per correct pick |
| ------------ | ----------------------- |
| Group        | 1                       |
| Round of 32  | 2                       |
| Round of 16  | 3                       |
| Quarterfinal | 4                       |
| Semifinal    | 5                       |
| Final        | 6                       |

A pick is "correct" when its normalized team name equals the recorded result
(see `normalizeTeam` — strips accents/case/extra spaces, so "Curaçao" matches
"Curacao"). For knockout games the "result" is the winning team's name.

**Ranking is _dense_:** everyone with the same points shares a rank, and the
next group gets the next consecutive number (1, 2, 2, 3 — _not_ 1, 2, 2, 4).

---

## 2. Tech stack

- **Angular 21** standalone components, **zoneless**, signal-based.
  - No NgModules. Routes use `loadComponent` (lazy). State is Angular signals
    (`signal`, `computed`); no NgRx/RxJS store. `HttpClient` for fetches.
- **SCSS** per-component + one global `src/styles.scss` (CSS variables theme).
- **Vitest** for tests (`npm test`). Currently only `app.spec.ts`.
- **Backend:** a single **Google Apps Script** web app reading/writing a Google
  Sheet — the only live/mutable datastore. No server of our own.
- **Hosting:** Vercel (static SPA). Build = `ng build`; output =
  `dist/world-cup-2026/browser`; SPA rewrite so deep links like `/admin` work.

---

## 3. Architecture & data flow

```
World Cup 2026 Data.xlsx
   │  (npm run convert  — MANUAL, one-off)
   ▼
public/picks.json          ← locked participant picks + group games (baked in)
   │
   ▼  HttpClient GET picks.json (on app load)
Angular SPA (browser)  ──── computes leaderboard / picks views in the browser
   │
   ├── GET  {appsScriptUrl}  → { results, matchups }     (live)
   └── POST {appsScriptUrl}  → set result / set matchup / verify / reset
                                     │
                                     ▼
                          Google Apps Script  ⇄  Google Sheet (Results, Matchups tabs)
```

**Two data sources, very different lifecycles:**

1. **Locked, baked-in:** participant picks and the fixed group-stage games live
   in `public/picks.json`, generated from the Excel at build prep time and
   committed to the repo. These never change at runtime.
2. **Live, mutable:** match **results** and knockout **matchups** live in the
   Google Sheet, edited through the admin panel. Fetched on every load.

`DataService` merges them: `games()` = locked group games + knockout games from
`KNOCKOUT_SCHEDULE` with admin-selected teams (`matchups()`) spliced in.

### Backend contract (`apps-script/Code.gs`)

- `GET /exec` → `{ ok, results: {gameId: winner}, matchups: {gameId:{home,away}} }`
- `POST /exec` (body sent as `text/plain` to dodge a CORS preflight):
  - `{ passcode, action:'verify' }` — unlock check, no write
  - `{ passcode, gameId, result }` — set/clear a result (empty `result` clears)
  - `{ passcode, action:'matchup', gameId, home, away }` — set knockout teams
  - `{ passcode, action:'reset' }` — wipe all results + matchups (testing)
- Passcode is checked **server-side**, stored in Apps Script Script Properties
  under `PASSCODE`. The frontend never holds the real passcode.

---

## 4. File map

```
world-cup-2026/
├── docs/
│   └── PROJECT_OVERVIEW.md      ← you are here
├── public/
│   ├── picks.json               LOCKED picks + group games (generated, committed)
│   ├── favicon.png, apple-touch-icon.png
├── scripts/
│   ├── convert-excel.js         Excel → public/picks.json   (npm run convert)
│   └── build-group-schedule.js  group kickoff times/venues → group-schedule.ts
├── src/
│   ├── index.html, main.ts, styles.scss   global shell + theme (CSS vars)
│   ├── environments/environment.ts         appsScriptUrl (backend endpoint)
│   └── app/
│       ├── app.ts / app.html / app.scss     root shell: header, nav, footer
│       ├── app.routes.ts                     route table (lazy components)
│       ├── app.config.ts                     providers (router, http, zoneless)
│       ├── models.ts                         types + STAGES + gameLabel/stageInfo
│       ├── data/
│       │   ├── flags.ts                      team name → ISO code (flagcdn.com)
│       │   ├── group-schedule.ts             GENERATED kickoff/venue by game id
│       │   └── knockout-schedule.ts          fixed knockout bracket + schedule
│       ├── flag/flag.ts                       <app-flag [team]> inline flag img
│       ├── services/
│       │   ├── data.service.ts               central signal store + backend I/O
│       │   └── scoring.ts                     normalizeTeam, isPickCorrect, leaderboard
│       ├── util/datetime.ts                   PT (America/Los_Angeles) formatters
│       └── pages/
│           ├── leaderboard/                   ranked table + expandable picks
│           ├── schedule/                      all matches by day
│           ├── my-picks/                      name lookup → personal picks
│           └── admin/                         passcode-gated result/matchup entry
├── angular.json, package.json, tsconfig*.json
└── vercel.json                                build + SPA rewrite config
```

---

## 5. Key conventions

- **Standalone + signals only.** New components are standalone (`imports: [...]`
  in the decorator), state via `signal`/`computed`. Templates use the new
  control flow (`@if`, `@for`, `@switch`) — not `*ngIf`/`*ngFor`.
- **Game ids are strings as map keys.** `picks`, `results`, and `matchups` are
  all `Record<string, ...>` keyed by the numeric game id stringified. Note
  `tsconfig` has `noPropertyAccessFromIndexSignature`, so index into these maps
  with brackets (`results[g.id]`), not dot access.
- **Always render team names through `<app-flag [team]="...">`** for the flag,
  and add the team to `flags.ts` (lowercased key → ISO alpha-2). Unknown teams
  render no flag (safe). "Turkey" is a special case: it renders the Turkey flag
  **rotated 180° (upside down)** by request (handles "Turkey" and "Turkiye").
- **Times are always Pacific.** Use the helpers in `util/datetime.ts`; never
  format dates ad hoc. Kickoffs are stored as absolute UTC ISO strings.
- **Theme via CSS variables** defined in `src/styles.scss` (`--red`, `--ink`,
  `--paper`, `--line`, `--radius`, etc.). Reuse them instead of hardcoding
  colors.
- **Responsive breakpoints:** `640px` and `400px` for the global shell/nav;
  individual pages use `560px` for their own mobile reflows. Mobile fixes are
  scoped inside `@media (max-width: …)` so desktop is untouched.

---

## 6. Build, run, deploy

```bash
npm install
npm start               # dev server → http://localhost:4200
npm run build           # prod build → dist/world-cup-2026/browser
npm test                # vitest

npm run convert         # Excel → public/picks.json   (MANUAL — see gotchas)
npm run convert:r32     # merge Round of 32.xlsx picks INTO public/picks.json (run AFTER convert)
npm run convert:r16     # merge Round of 16.xlsx picks INTO public/picks.json (run AFTER convert)
npm run build:schedule  # regenerate src/app/data/group-schedule.ts
```

- **Verify changes:** there is no Playwright/browser MCP wired into this repo,
  so visual/mobile checks are done by a human opening `http://localhost:4200`
  (use DevTools device mode for phone widths). `npm run build` is the quick way
  to confirm a change type-checks.
- **Deploy:** push; Vercel runs `ng build` and serves the static output with the
  SPA rewrite from `vercel.json`. The backend (`appsScriptUrl`) is independent —
  redeploying the Apps Script gives a new `/exec` URL that must be pasted into
  `src/environments/environment.ts`.

---

## 7. Gotchas (read before editing data)

- **`npm run convert` will overwrite `public/picks.json`.** It regenerates from
  `World Cup 2026 Data.xlsx`. It is **not** part of `npm run build` or the
  Vercel deploy — it only runs when invoked manually. Any hand-edit to
  `picks.json` (see the Bosnia rename below) is **reverted** if someone re-runs
  convert against the unchanged Excel.
- **Knockout picks are separate imports; re-run them after every `convert`.**
  Group picks come from `convert`; each knockout round's winner picks come from
  its own form export (e.g. `Round of 32.xlsx`) and are **merged into**
  `picks.json` keyed by FIFA match id via a per-round merge script (`npm run
  convert:r32`, and the same pattern for later rounds — see
  [§8](#8-adding-the-next-knockout-round-repeatable)). Because `convert` rewrites
  `picks.json` from scratch (group picks only), you must re-run every knockout
  merge **after** any `convert` or those picks are lost. The merge canonicalizes
  team names to the app's spellings ("Bosnia and Herzegovina"→"Bosnia", "Cabo
  Verde"→"Cape Verde").
- **Knockout matchup teams are baked into `knockout-schedule.ts`, not the Sheet.**
  Normally knockout matchups are admin-set (live, in the Google Sheet). In
  practice each round's actual teams are hard-coded into `KNOCKOUT_SCHEDULE`
  (`home`/`away`) as the round is set, so the bracket shows without a round-trip;
  `games()` still lets a live admin-set matchup override them. **Results
  (winners) are NOT baked** — they remain live: enter each winner in the admin
  panel as games finish.
- **Bosnia naming:** the team is displayed as **"Bosnia"** everywhere. This was
  changed by hand in `public/picks.json`, `scripts/build-group-schedule.js`, and
  the `flags.ts` key (`bosnia: 'ba'`). The source `World Cup 2026 Data.xlsx`
  still says "Bosnia and Herzegovina" — so a future `npm run convert` would
  bring the long name back. To make it permanent, either fix the Excel or add a
  rename step in `scripts/convert-excel.js`.
- **No auth on `/my-picks`.** Picks are public (the leaderboard already lets
  anyone expand anyone's picks), so the My Picks page intentionally has no
  password — anyone who knows a name can view those picks.
- **`appsScriptUrl` is committed** in `environment.ts`. It's a deployment
  endpoint, not a secret; the real admin passcode lives only in Apps Script
  Script Properties. Still, treat the URL as semi-public.
- **"Current"/"live" markers are relative to page load** (`nowMs` captured once
  on open) — they don't tick live; a refresh re-evaluates them. The schedule's
  red outline (`.current`) marks the game in play (kicked off, no result yet), so
  between games nothing is outlined until the next kickoff + refresh.

---

## 8. Adding the next knockout round (repeatable)

The Round of 32 was wired up with the recipe below. Each later round (Round of
16 → games 89–96, Quarterfinals → 97–100, Semifinals → 101–102, Final → 104) is
done **exactly the same way**. The UI needs no changes — the schedule, the
leaderboard's expandable picks, and `/my-picks` all pick up new rounds
automatically (a new collapsible round section appears; in the leaderboard only
the newest round is open by default — see item 16 — while `/my-picks` still opens
all knockout rounds).

**Inputs you need for the round:**

- The round's picks form export, saved in the **outer project folder** (next to
  `World Cup 2026 Data.xlsx`, one level above the `world-cup-2026/` app) as e.g.
  `Round of 16.xlsx` (same shape as `Round of 32.xlsx`: a `Name` column + one
  column per matchup, header `"Home vs. Away"`, each cell the team that
  participant picked to win). Extra columns like `Rank`/`Points` are ignored, and
  a cell of `X`/`x` or blank counts as no pick (stored as the literal `"x"` — see
  step 2 — so the missed game still shows in that person's picks and scores 0).
- The actual matchups (which two teams are in each game). Take them from the form
  header and confirm the FIFA match id for each by **venue + date** against the
  live bracket — that mapping is already encoded in `knockout-schedule.ts`.

**Steps:**

1. **Set the teams in `src/app/data/knockout-schedule.ts`.** Fill the `home`/`away`
   args on each `ko(...)` for that round's match ids (R16 = 89–96, etc.), using the
   app's canonical team spellings (see `flags.ts`; e.g. "Bosnia", "Cape Verde",
   "DR Congo", "USA"). Add any brand-new team to `flags.ts` (lowercased name → ISO
   alpha-2) so its flag renders.
2. **Make the round's merge script.** Copy `scripts/convert-r16.js` to
   `scripts/convert-r8.js` (etc.) and change: the `XLSX_PATH` filename (the round's
   Excel lives in the **outer** project folder next to `World Cup 2026 Data.xlsx`,
   i.e. `path.join(ROOT, '..', '<file>.xlsx')`), the `HOME_TEAM_TO_ID` map (each
   matchup's canonical **home** team → its FIFA match id), and any new entries in
   `TEAM_ALIASES` (alternate spellings → canonical). The home team of each matchup
   is unique within a round, so that map is unambiguous. The script treats a cell
   of `X`/`x` or blank as **no pick** and stores the literal `"x"` for it (via
   `isNoPick`), so the missed game still appears in that person's picks; `"x"`
   matches no team, so it scores 0. (Re-running with a changed cell that became
   `X` after a prior real import won't overwrite the old value on its own — strip
   the round's ids first, or rebuild, when a pick changes to a miss.)
3. **Add an npm script.** In `package.json`, add
   `"convert:r16": "node scripts/convert-r16.js"` (mirror `convert:r32`).
4. **Run it:** `npm run convert:r16`. It merges each participant's picks into
   `public/picks.json` under the round's ids (it preserves earlier picks and is
   idempotent). It prints `participants updated: N/37` and the matchup→id map —
   eyeball both. Commit the updated `picks.json`.
5. **Verify:** `npm run build` (type-check) and open `/` + `/my-picks` to confirm
   the round shows with the right teams and everyone's picks.
6. **Results stay live.** As each game finishes, enter the winner in `/admin`
   (the round's games now show with real teams, so just click the winner). Scoring
   is automatic and stage-weighted (R16 = 3 pts, QF = 4, SF = 5, Final = 6; a pick
   is correct when it matches the recorded winner, no draws in knockout).

> Reminder (from §7): `npm run convert` rewrites `picks.json` from the group Excel
> only, so after any `convert` you must re-run **every** `convert:rNN` to restore
> the knockout picks.

---

## 9. Change log — work done in this session

All changes are mobile-friendliness + feature/UX requests:

1. **Schedule page — mobile stacked layout** (`pages/schedule/schedule.scss`).
   Added a `@media (max-width: 560px)` block that reflows each match into a card:
   time + status on a top strip, the two teams stacked vertically with a leading
   flag and full-width name. Fixes squished team names on phones. (Later
   superseded on desktop by item 10's row restructure.)
2. **Navbar — single row on mobile** (`src/styles.scss`). The nav links now sit
   in one full-width, evenly-spaced, no-wrap row at all phone widths (font/
   padding scale down at ≤400px) instead of stacking or wrapping raggedly.
3. **New page: My Picks** (`pages/my-picks/*`, route `/my-picks`, nav link in
   `app.html`). Name lookup (accent/case-insensitive, with a datalist
   autocomplete and "did you mean" suggestion chips) → that player's picks
   grouped by stage with correct/wrong/pending tags and a points/correct/rank
   summary. Reuses `DataService`, `scoring.ts`, and `<app-flag>`.
4. **Admin — mobile fit for matchup/winner controls** (`pages/admin/admin.scss`).
   `@media (max-width: 560px)`: gave the grid buttons/selects `min-width: 0` so
   they shrink instead of overflowing, reduced their padding/font, and reflowed
   the knockout "Winner" row so the label sits on its own line and the two team
   buttons share full width. Fixes content bleeding off-screen.
5. **Leaderboard — column cleanup** (`pages/leaderboard/*`). Removed the
   "Correct" column entirely (grid is now `# | Name | Pts`) and scoped the large
   point-total font to data rows so the header titles are all the same size.
6. **Dense ranking** (`services/scoring.ts`). Switched from standard competition
   ranking (1, 2, 2, 4) to dense ranking (1, 2, 2, 3).
7. **Bosnia rename** — "Bosnia and Herzegovina" → "Bosnia" across
   `public/picks.json` (29×), `scripts/build-group-schedule.js`, and `flags.ts`.
   (See gotcha above re: the Excel source.)
8. **My Picks — centered pick + column headers** (`pages/my-picks/*`). Each pick
   row is `Match | Picked | Result` with equal flexible side columns
   (`minmax(0,1fr) auto minmax(0,1fr)`) so the picked team sits centered. Added a
   per-stage header row (`.pick-head`) labeling the columns **Match · Picked ·
   Result**, with "Picked" centered over the pick column.
9. **Turkey flag — upside down** (`flag/flag.ts`). Replaced the trash-can emoji
   with the real Turkey flag image (`flagcdn.com/tr.svg`) rotated 180° via a
   `.upside-down` class. Still matches both "Turkey" and "Turkiye".
10. **Schedule — row restructure (desktop)** (`pages/schedule/{schedule.html,
    schedule.scss}`). Pulled the stage badge out of the teams block and put the
    **stage badge + venue together in their own column** (`.sched-info`, stacked,
    capped width `9.5rem`). Row grid is now `time | group+venue | teams |
    status`, all `align-items: center`. This keeps the venue from running under
    the team names and vertically centers the matchup in the row. (Mobile keeps
    the stacked layout from item 1, with group+venue inline above the teams.)
11. **Round of 32 wired up** (`data/knockout-schedule.ts`,
    `scripts/convert-r32.js`, `public/picks.json`, `package.json`). Imported the
    16 R32 matchups + every participant's R32 winner pick from `Round of 32.xlsx`.
    The 16 actual teams are baked into `KNOCKOUT_SCHEDULE` games 73–88 (mapped to
    FIFA match ids by venue/date, cross-checked against the live bracket); the
    per-participant picks are merged into `picks.json` under those ids by the new
    `npm run convert:r32` (idempotent, name-canonicalizing). Scoring needed no
    code change — R32 already pays 2 pts/correct, 0 otherwise, no draws. Winners
    are still entered via the admin panel (only game 73, Canada, is decided so
    far). See the two new gotchas above, and §8 for the repeatable recipe.
12. **Picks grouped into collapsible rounds** (`pages/leaderboard/*`,
    `pages/my-picks/*`). The leaderboard's expandable picks and the My Picks page
    now group a player's picks by round, newest round first. Each round is a
    collapsible section (`isStageOpen`/`toggleStage`, caret + pick count);
    **knockout rounds are open by default, the group stage is collapsed**, so the
    72 group games don't bury the latest round. New rounds appear automatically.
13. **Round of 16 wired up** (`data/knockout-schedule.ts`, `scripts/convert-r16.js`,
    `public/picks.json`, `package.json`). Same recipe as item 11: the 8 R16 team
    matchups are baked into `KNOCKOUT_SCHEDULE` games 89–96 (derived by matching
    `Round of 16.xlsx` headers to each game's `Wxx vs Wyy` pairing × the R32
    winners), and every participant's R16 winner pick was merged into `picks.json`
    via the new `npm run convert:r16`. All 37 names matched. `convert-r16.js` reads
    its Excel from the **outer** project folder (like `convert-excel.js`), and adds
    `X`/blank = no-pick handling on top of the R32 script. All R16 teams already
    existed in `flags.ts`; no scoring change (R16 pays 3 pts/correct). Winners stay
    live via `/admin`.
14. **R16 data corrections** (`scripts/convert-r16.js`, `public/picks.json`).
    Two follow-ups after item 13: (a) **Becca G. / Erika W. mix-up** — Erika
    submitted late and her Canada/Morocco (game 90) answer had been entered under
    Becca. The sheet was corrected (Becca → Morocco, Erika → `X`) and picks.json
    rebuilt: restore the committed JSON, strip R16 ids 89–96, re-run
    `convert:r16`. (b) **Missed games now kept, not dropped** — `convert-r16.js`
    now stores the literal `"x"` for a blank/`X` cell instead of skipping it, so
    the 5 missed R16 games (Erika g90; Jonathan F. g89–90; Ismael A. g89–90) show
    up in those players' picks as a miss (scores 0) rather than vanishing. All 8
    R16 games now list 37/37 participants. **Caveat:** there is no
    `Round of 32.xlsx` on disk anymore, so a bare `npm run convert` (which rewrites
    picks.json from the group Excel only) would lose the R32 picks with no way to
    re-import — keep that file, or only ever re-run `convert:r16` against the
    already-baked JSON.
15. **Quarterfinals wired up** (`data/knockout-schedule.ts`, `scripts/convert-qf.js`,
    `public/picks.json`, `package.json`). Same recipe as items 11/13: the 4 QF team
    matchups are baked into `KNOCKOUT_SCHEDULE` games 97–100 (mapped by each game's
    `Wxx vs Wyy` pairing × the R16 winners — France vs. Morocco → 97, Spain vs.
    Belgium → 98, Norway vs. England → 99, Argentina vs. Switzerland → 100), and
    every participant's QF winner pick was merged into `picks.json` via the new
    `npm run convert:qf` (reads `Quarter-Finals.xlsx` from the outer folder). All 37
    names matched; 8 blank/`X` cells stored as `"x"` (2 no-picks per game). All QF
    teams already existed in `flags.ts`; no scoring change (QF pays 4 pts/correct).
    Winners stay live via `/admin`.
16. **Only the latest round opens by default in the leaderboard picks**
    (`pages/leaderboard/leaderboard.ts`). Superseded item 12's "all knockout rounds
    open" default: `isStageOpen` now opens **only** the newest round the player has
    picks in (`defaultOpenStage` = the first, newest-first `groups()` entry — the
    Quarterfinals today) and collapses every other round, including earlier
    knockout rounds. Auto-advances to SF/Final as they're wired up; manual toggling
    unchanged. (My Picks was left as-is.)
17. **Schedule outline follows the current game, not the next upcoming**
    (`pages/schedule/{schedule.ts,schedule.html,schedule.scss}`). Replaced the
    "next not-yet-played" highlight (`nextId`/`isNext`) with the in-play game
    (`currentId`/`isCurrent` = started, no result yet; latest kickoff if several are
    live). The red outline (CSS `.next` → `.current`) now marks the game being
    played; removed the now-redundant "Next" tag + its `.next-tag` CSS ("In play"
    already labels it). Nothing is outlined between games (see the gotcha).
18. **Semifinals wired up** (`data/knockout-schedule.ts`, `scripts/convert-sf.js`,
    `public/picks.json`, `package.json`). Same recipe as items 11/13/15: the 2 SF
    team matchups are baked into `KNOCKOUT_SCHEDULE` games 101–102 (mapped by each
    game's `Wxx vs Wyy` pairing × the QF winners — France vs. Spain → 101, England
    vs. Argentina → 102), and every participant's SF winner pick was merged into
    `picks.json` via the new `npm run convert:sf` (reads `Semi-Finals.xlsx` from the
    outer folder). All 37 names matched; 4 blank/`X` cells stored as `"x"` (Dietrich
    D. and Matt P. skipped both games). All SF teams already existed in `flags.ts`;
    no scoring change (SF pays 5 pts/correct). Winners stay live via `/admin`.
19. **Final wired up** (`data/knockout-schedule.ts`, `scripts/convert-final.js`,
    `public/picks.json`, `package.json`). Baked the finalists into
    `KNOCKOUT_SCHEDULE` game 104 (**Spain vs. Argentina** — game 104's `W101 vs
    W102` × the SF winners) and merged each participant's Final winner pick into
    `picks.json` via the new `npm run convert:final`. **The Final form export is a
    raw Google-Forms shape** (`Final.xlsx` in the outer folder), unlike the tidy
    prior-round files: it has `Timestamp`/`Email Address`/`Name ` columns (note the
    trailing space) plus extra non-scored questions (3rd-place winner, extra time,
    penalties). `convert-final.js` handles this — it trims header cells and only
    imports the single matchup column (the one with `" vs. "`); every other column
    is ignored. **Only 31 of 37 submitted**, so unlike earlier rounds the script
    also defaults id 104 to `"x"` for the 6 non-responders (Dietrich D., George,
    Matt P., Tony R., Austin M., Jovanny R.) so the Final still shows for all 37 and
    scores 0 for them — final tally 18 Spain / 13 Argentina / 6 no-pick. All Final
    teams already existed in `flags.ts`; no scoring change (Final pays 6 pts/correct,
    already in `STAGES`). Winner stays live via `/admin` — enter it once the game
    (today, 2026-07-19, kickoff 19:00 UTC / 12:00 PT at MetLife) finishes.
