// Merges Semifinal picks into public/picks.json from "Semi-Finals.xlsx".
//
// After the Quarterfinals a follow-up Google Form collected each participant's
// Semifinal winner picks. That export ("Semi-Finals.xlsx") has one sheet:
//   Name | <2 SF matchup columns "Home vs. Away">
// Each cell is the team that participant picked to advance (or "X"/blank if they
// left a matchup unpicked — those are stored as the literal "x" so the missed
// game still shows in that person's picks; "x" matches no team, so it scores 0).
//
// Group picks live in public/picks.json keyed by group game id (1..72). The
// knockout games use their FIFA match numbers as ids (101..102 for the SF), so
// this script maps each matchup column to its FIFA match id and writes the pick
// into each participant under that id. It MERGES (group + R32 + R16 + QF picks
// are preserved) and is idempotent, so it can be re-run safely.
//
// The matchup -> FIFA id mapping was fixed by matching each matchup's teams (the
// QF winners) to the bracket pairings in src/app/data/knockout-schedule.ts.
// Team names are canonicalized to the forms the rest of the app uses (flags.ts).
//
// Run: npm run convert:sf   (run AFTER npm run convert, which overwrites picks.json)

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ROOT = path.join(__dirname, '..');
// Excel inputs live in the outer project folder alongside "World Cup 2026 Data.xlsx".
const XLSX_PATH = path.join(ROOT, '..', 'Semi-Finals.xlsx');
const PICKS_PATH = path.join(ROOT, 'public', 'picks.json');

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

// Each SF matchup -> its FIFA match id, keyed by the canonical home team (the
// first team in the form's "Home vs. Away" header). Home teams are unique, so
// this unambiguously maps every column. Mapping derived from knockout-schedule.ts
// (each game's "Wxx vs Wyy" pairing + the QF winners).
const HOME_TEAM_TO_ID = {
  'France': 101,
  'England': 102,
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

  const headerRowIdx = rows.findIndex((r) => r.map(String).includes('Name'));
  if (headerRowIdx === -1) {
    console.error('Could not find a header row containing "Name".');
    process.exit(1);
  }
  const headers = rows[headerRowIdx].map((h) => String(h).trim());
  const nameCol = headers.indexOf('Name');

  // Map each matchup column to its FIFA match id via the canonical home team.
  // Non-matchup columns (Rank, Points) have no " vs " and are ignored.
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

  if (unmatched.length) {
    console.error(`WARNING: ${unmatched.length} SF name(s) not found in picks.json: ${unmatched.join(', ')}`);
  }

  fs.writeFileSync(PICKS_PATH, JSON.stringify(picksData, null, 2), 'utf8');

  console.log(`Updated ${PICKS_PATH}`);
  console.log(`  participants updated: ${updated}/${picksData.participants.length}`);
  console.log(`  blank/"X" picks stored as "x": ${missed}`);
  console.log(`  SF matchups (id: home vs. away):`);
  matchups
    .sort((a, b) => a.id - b.id)
    .forEach((m) => console.log(`    ${m.id}: ${m.home} vs. ${m.away}`));
}

main();
