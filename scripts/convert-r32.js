// Merges Round-of-32 picks into public/picks.json from "Round of 32.xlsx".
//
// After the group stage a second Google Form collected each participant's
// Round-of-32 winner picks. That export ("Round of 32.xlsx") has one sheet:
//   Name | <16 R32 matchup columns "Home vs. Away">
// Each cell is the team that participant picked to advance.
//
// Group picks live in public/picks.json keyed by group game id (1..72). The
// knockout games use their FIFA match numbers as ids (73..88 for the R32), so
// this script maps each matchup column to its FIFA match id and writes the pick
// into each participant under that id. It MERGES (group picks are preserved) and
// is idempotent, so it can be re-run safely.
//
// The matchup -> FIFA id mapping was fixed by matching each matchup's venue and
// date to src/app/data/knockout-schedule.ts. Team names are canonicalized to the
// forms the rest of the app uses (see flags.ts): "Bosnia and Herzegovina" ->
// "Bosnia", "Cabo Verde" -> "Cape Verde".
//
// Run: npm run convert:r32   (run AFTER npm run convert, which overwrites picks.json)

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ROOT = path.join(__dirname, '..');
const XLSX_PATH = path.join(ROOT, 'Round of 32.xlsx');
const PICKS_PATH = path.join(ROOT, 'public', 'picks.json');

// Canonical team names used across the app (flags.ts keys). The R32 form export
// used a couple of longer/alternate spellings; map them to the app's form.
const TEAM_ALIASES = {
  'bosnia and herzegovina': 'Bosnia',
  'cabo verde': 'Cape Verde',
};

function canonTeam(value) {
  const s = String(value ?? '').replace(/\s+/g, ' ').trim();
  return TEAM_ALIASES[s.toLowerCase()] ?? s;
}

// Each R32 matchup -> its FIFA match id, keyed by the canonical home team (the
// first team in the form's "Home vs. Away" header). Home teams are unique, so
// this unambiguously maps every column. Mapping derived from knockout-schedule.ts
// (venue + kickoff date for each match number).
const HOME_TEAM_TO_ID = {
  'South Africa': 73,
  'Germany': 74,
  'Netherlands': 75,
  'Brazil': 76,
  'France': 77,
  'Ivory Coast': 78,
  'Mexico': 79,
  'England': 80,
  'USA': 81,
  'Belgium': 82,
  'Portugal': 83,
  'Spain': 84,
  'Switzerland': 85,
  'Argentina': 86,
  'Colombia': 87,
  'Australia': 88,
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
      const pick = canonTeam(row[col]);
      if (pick) participant.picks[String(id)] = pick;
    }
    updated++;
  }

  if (unmatched.length) {
    console.error(`WARNING: ${unmatched.length} R32 name(s) not found in picks.json: ${unmatched.join(', ')}`);
  }

  fs.writeFileSync(PICKS_PATH, JSON.stringify(picksData, null, 2), 'utf8');

  console.log(`Updated ${PICKS_PATH}`);
  console.log(`  participants updated: ${updated}/${picksData.participants.length}`);
  console.log(`  R32 matchups (id: home vs. away):`);
  matchups
    .sort((a, b) => a.id - b.id)
    .forEach((m) => console.log(`    ${m.id}: ${m.home} vs. ${m.away}`));
}

main();
