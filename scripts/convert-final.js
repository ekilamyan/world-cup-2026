// Merges Final picks into public/picks.json from "Final.xlsx".
//
// After the Semifinals a follow-up Google Form collected each participant's
// Final winner pick. That export ("Final.xlsx") has one sheet with a Google
// Forms shape: Timestamp | Email Address | Name | <the matchup column
// "Home vs. Away"> | ...extra question columns (3rd place, extra time, penalty
// kicks). Only the matchup column (the one with " vs. ") is scored; every other
// column is ignored. Each matchup cell is the team that participant picked to
// win (or "X"/blank -> stored as the literal "x" so the missed game still shows
// in their picks; "x" matches no team, so it scores 0).
//
// The Final is FIFA match id 104. This script maps the matchup column to that id
// and writes the pick into each participant. It MERGES (group + R32 + R16 + QF +
// SF picks are preserved) and is idempotent, so it can be re-run safely.
//
// Not every participant submitted the Final form, so after importing responses
// this script defaults id 104 to "x" (no pick) for anyone still missing it — the
// Final then shows for all participants (a miss scores 0), consistent with the
// earlier rounds' N/N reporting.
//
// The matchup was confirmed against src/app/data/knockout-schedule.ts (game 104
// = W101 vs W102 = the SF winners, Spain vs. Argentina). Team names are
// canonicalized to the forms the rest of the app uses (flags.ts).
//
// Run: npm run convert:final   (run AFTER npm run convert, which overwrites picks.json)

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ROOT = path.join(__dirname, '..');
// Excel inputs live in the outer project folder alongside "World Cup 2026 Data.xlsx".
const XLSX_PATH = path.join(ROOT, '..', 'Final.xlsx');
const PICKS_PATH = path.join(ROOT, 'public', 'picks.json');

const FINAL_ID = 104;

// Canonical team names used across the app (flags.ts keys). Map any longer/
// alternate spellings from the form export to the app's form.
const TEAM_ALIASES = {
  'bosnia and herzegovina': 'Bosnia',
  'cabo verde': 'Cape Verde',
};

function canonTeam(value) {
  const s = String(value ?? '').replace(/\s+/g, ' ').trim();
  return TEAM_ALIASES[s.toLowerCase()] ?? s;
}

// "X" (case-insensitive) or an empty cell means the participant made no pick for
// that matchup — stored as the literal "x" (below) so the missed game still
// appears in their picks instead of silently vanishing.
function isNoPick(value) {
  const s = String(value ?? '').trim();
  return s === '' || s.toLowerCase() === 'x';
}

// Each matchup -> its FIFA match id, keyed by the canonical home team (the first
// team in the form's "Home vs. Away" header). Mapping derived from
// knockout-schedule.ts (game 104's "W101 vs W102" pairing + the SF winners).
const HOME_TEAM_TO_ID = {
  'Spain': FINAL_ID,
};

function main() {
  if (!fs.existsSync(XLSX_PATH)) {
    console.error(`Excel file not found at: ${XLSX_PATH}`);
    process.exit(1);
  }
  if (!fs.existsSync(PICKS_PATH)) {
    console.error(`picks.json not found at: ${PICKS_PATH} (run "npm run convert" first)`);
    process.exit(1);
  }

  const wb = XLSX.readFile(XLSX_PATH);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false });

  // Header cells can carry stray whitespace (e.g. "Name "), so match on trimmed
  // values throughout.
  const headerRowIdx = rows.findIndex((r) => r.map((c) => String(c).trim()).includes('Name'));
  if (headerRowIdx === -1) {
    console.error('Could not find a header row containing "Name".');
    process.exit(1);
  }
  const headers = rows[headerRowIdx].map((h) => String(h).trim());
  const nameCol = headers.indexOf('Name');

  // Map each matchup column to its FIFA match id via the canonical home team.
  // Non-matchup columns (Timestamp, Email Address, extra questions) have no
  // " vs " and are ignored.
  const colToId = new Map(); // column index -> game id
  const matchups = []; // { id, home, away } for verification/logging
  headers.forEach((h, col) => {
    if (col === nameCol || !h) return;
    const parts = h.split(/\s+vs\.?\s+/i);
    if (parts.length !== 2) return;
    const home = canonTeam(parts[0]);
    const away = canonTeam(parts[1]);
    const id = HOME_TEAM_TO_ID[home];
    if (!id) {
      console.error(`No FIFA id mapping for matchup home team "${home}" (header: "${h}")`);
      process.exit(1);
    }
    colToId.set(col, id);
    matchups.push({ id, home, away });
  });

  const picksData = JSON.parse(fs.readFileSync(PICKS_PATH, 'utf8'));
  const byName = new Map(picksData.participants.map((p) => [p.name.trim().toLowerCase(), p]));

  let updated = 0;
  let missed = 0;
  const unmatched = [];
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const name = String(row[nameCol] ?? '').trim();
    if (!name) continue;
    const participant = byName.get(name.toLowerCase());
    if (!participant) {
      unmatched.push(name);
      continue;
    }
    for (const [col, id] of colToId.entries()) {
      if (isNoPick(row[col])) {
        participant.picks[String(id)] = 'x';
        missed++;
        continue;
      }
      participant.picks[String(id)] = canonTeam(row[col]);
    }
    updated++;
  }

  // Participants who never submitted the Final form: default them to "x" so the
  // Final still shows in their picks (scores 0).
  let defaulted = 0;
  for (const p of picksData.participants) {
    if (p.picks[String(FINAL_ID)] == null) {
      p.picks[String(FINAL_ID)] = 'x';
      defaulted++;
    }
  }

  if (unmatched.length) {
    console.error(`WARNING: ${unmatched.length} Final name(s) not found in picks.json: ${unmatched.join(', ')}`);
  }

  fs.writeFileSync(PICKS_PATH, JSON.stringify(picksData, null, 2), 'utf8');

  console.log(`Updated ${PICKS_PATH}`);
  console.log(`  participants updated from form: ${updated}/${picksData.participants.length}`);
  console.log(`  blank/"X" picks stored as "x": ${missed}`);
  console.log(`  non-responders defaulted to "x": ${defaulted}`);
  console.log(`  Final matchup (id: home vs. away):`);
  matchups
    .sort((a, b) => a.id - b.id)
    .forEach((m) => console.log(`    ${m.id}: ${m.home} vs. ${m.away}`));
}

main();
