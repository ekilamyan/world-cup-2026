# World Cup 2026 Pool

Leaderboard + admin site for the FIFA World Cup 2026 prediction pool.

- **Leaderboard** (`/`) — everyone ranked by points. Group-stage games are 1 pt
  each (a pick is correct when it matches the recorded result). Tap a row to see
  that person's picks vs. results.
- **Admin** (`/admin`) — passcode-gated; enter each match result and it saves
  instantly to the Google Sheet and updates the leaderboard.

## How the data flows

```
World Cup 2026 Data.xlsx ──(npm run convert)──► public/picks.json   (locked picks, baked in)
Browser (Angular SPA on Vercel) ──reads picks.json──► computes leaderboard
                                ──GET/POST results──► Google Apps Script ──► Google Sheet (live results DB)
```

Participant picks are locked, so they're baked into `public/picks.json` at build
time. The only live/mutable data is **match results**, which live in a Google
Sheet edited via the admin panel (or by hand).

## Setup

1. **Results backend (one-time):** follow `../apps-script/SETUP.md` to create the
   Google Sheet + Apps Script, set the admin `PASSCODE`, deploy the web app, and
   paste its `/exec` URL into `src/environments/environment.ts`.
2. **Picks data:** if the Excel changes, regenerate with `npm run convert`
   (reads `../World Cup 2026 Data.xlsx` → `public/picks.json`). Commit the JSON.

## Commands

```bash
npm install
npm run convert         # Excel -> public/picks.json (locked group picks)
npm run build:schedule  # regenerate group kickoff times/venues -> src/app/data/group-schedule.ts
npm start               # dev server at http://localhost:4200
npm run build           # production build -> dist/world-cup-2026/browser
```

Pages: `/` leaderboard, `/schedule` (all 104 matches, PT, knockout teams fill in
as they're set), `/admin`. Scoring is stage-weighted (group 1 → final 6). The
knockout schedule lives in `src/app/data/knockout-schedule.ts`; group kickoff
times in `src/app/data/group-schedule.ts` (generated).

## Deploy (Vercel)

`vercel.json` is preconfigured: build `ng build`, output
`dist/world-cup-2026/browser`, with an SPA rewrite so `/admin` deep-links work.
Connect this folder as the project root in Vercel and deploy.
"# world-cup-2026" 
