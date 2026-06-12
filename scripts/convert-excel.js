// Converts "World Cup 2026 Data.xlsx" into public/picks.json.
//
// The Excel is a Google Forms export: one sheet with columns
//   Rank | Name | Points | <72 group matchups> | <8 bonus questions>
// Each participant row has, per matchup column, the team they picked to win
// (or "Draw"). Picks are locked, so we bake them into a static JSON file the
// Angular app fetches at runtime. Rank/Points/bonus columns are ignored.
//
// Run: npm run convert

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ROOT = path.join(__dirname, '..');
const XLSX_PATH = path.join(ROOT, '..', 'World Cup 2026 Data.xlsx');
const OUT_PATH = path.join(ROOT, 'public', 'picks.json');

// Headers that are NOT a group matchup. Everything else between "Points" and
// the first bonus question is treated as a game ("<home> vs. <away>").
const NON_GAME_HEADERS = new Set(['Rank', 'Name', 'Points']);

/**
 * Repair "mojibake" — text that was UTF-8 but got decoded as Latin-1 somewhere
 * upstream (the Google Form did this to one pick: "Curaçao" -> "CuraÃ§ao").
 * Only touches strings containing the tell-tale Ã/Â lead bytes, and only keeps
 * the re-decoded version if it has no replacement characters.
 */
function fixMojibake(value) {
  const s = String(value ?? '');
  if (!/[ÃÂ]/.test(s)) return s;
  try {
    const repaired = Buffer.from(s, 'latin1').toString('utf8');
    if (!repaired.includes('�')) return repaired;
  } catch {
    /* fall through */
  }
  return s;
}

// The 8 bonus-question headers (ignored — not scored per project scope).
const BONUS_HEADERS = new Set([
  'Who will win the award for Player of the Tournament',
  'Who will score the most goals?',
  'Who will win the award for best goalkeeper?',
  'Which continent will the winner be from?',
  'Will the winner of the World Cup be a first-time winner?',
  'Will a goalkeeper score a goal?',
  'What will be the total amount of goals scored during the entire tournament?',
  'Number of hat-tricks?',
]);

function main() {
  if (!fs.existsSync(XLSX_PATH)) {
    console.error(`Excel file not found at: ${XLSX_PATH}`);
    process.exit(1);
  }

  const wb = XLSX.readFile(XLSX_PATH);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  // header:1 => array-of-arrays; defval:'' so empty cells are '' not undefined.
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false });

  // Find the header row (the one containing "Name").
  const headerRowIdx = rows.findIndex((r) => r.map(String).includes('Name'));
  if (headerRowIdx === -1) {
    console.error('Could not find a header row containing "Name".');
    process.exit(1);
  }
  const headers = rows[headerRowIdx].map((h) => fixMojibake(h).trim());

  const nameCol = headers.indexOf('Name');

  // Game columns: every header that isn't Rank/Name/Points and isn't a bonus Q.
  const games = [];
  const gameColToId = new Map(); // column index -> game id
  headers.forEach((h, col) => {
    if (!h) return;
    if (NON_GAME_HEADERS.has(h) || BONUS_HEADERS.has(h)) return;
    const parts = h.split(/\s+vs\.?\s+/i);
    if (parts.length !== 2) return; // not a matchup-shaped header
    const id = games.length + 1;
    games.push({ id, label: h, home: parts[0].trim(), away: parts[1].trim() });
    gameColToId.set(col, id);
  });

  // Participant rows: everything after the header row that has a name.
  const participants = [];
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const name = fixMojibake(row[nameCol]).trim();
    if (!name) continue;
    const picks = {};
    for (const [col, id] of gameColToId.entries()) {
      const pick = fixMojibake(row[col]).trim();
      if (pick) picks[id] = pick;
    }
    participants.push({ name, picks });
  }

  const out = { games, participants };
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2), 'utf8');

  console.log(`Wrote ${OUT_PATH}`);
  console.log(`  games:        ${games.length}`);
  console.log(`  participants: ${participants.length}`);
  console.log(`  first game:   ${games[0]?.label}`);
  console.log(`  last game:    ${games[games.length - 1]?.label}`);
}

main();
