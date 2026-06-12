// Generates src/app/data/group-schedule.ts from the official group-stage
// schedule (kickoff times + venues, sourced from Wikipedia's per-group pages).
//
// Each row is [home, away, date, localTime, utcOffsetHours, venue, city] in the
// venue's local time; we convert to an absolute UTC instant and match it to the
// corresponding game id in public/picks.json by (unordered) team pair.
//
// Run: npm run build:schedule

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PICKS = path.join(ROOT, 'public', 'picks.json');
const OUT = path.join(ROOT, 'src', 'app', 'data', 'group-schedule.ts');

// home, away, date, localTime, utcOffset (hours), venue, city
const ROWS = [
  // Group A
  ['Mexico', 'South Africa', '2026-06-11', '1:00 PM', -6, 'Estadio Azteca', 'Mexico City'],
  ['South Korea', 'Czech Republic', '2026-06-11', '8:00 PM', -6, 'Estadio Akron', 'Zapopan'],
  ['Czech Republic', 'South Africa', '2026-06-18', '12:00 PM', -4, 'Mercedes-Benz Stadium', 'Atlanta'],
  ['Mexico', 'South Korea', '2026-06-18', '7:00 PM', -6, 'Estadio Akron', 'Zapopan'],
  ['Czech Republic', 'Mexico', '2026-06-24', '7:00 PM', -6, 'Estadio Azteca', 'Mexico City'],
  ['South Africa', 'South Korea', '2026-06-24', '7:00 PM', -6, 'Estadio BBVA', 'Guadalupe'],
  // Group B
  ['Canada', 'Bosnia', '2026-06-12', '3:00 PM', -4, 'BMO Field', 'Toronto'],
  ['Qatar', 'Switzerland', '2026-06-13', '12:00 PM', -7, "Levi's Stadium", 'Santa Clara'],
  ['Switzerland', 'Bosnia', '2026-06-18', '12:00 PM', -7, 'SoFi Stadium', 'Inglewood'],
  ['Canada', 'Qatar', '2026-06-18', '3:00 PM', -7, 'BC Place', 'Vancouver'],
  ['Switzerland', 'Canada', '2026-06-24', '12:00 PM', -7, 'BC Place', 'Vancouver'],
  ['Bosnia', 'Qatar', '2026-06-24', '12:00 PM', -7, 'Lumen Field', 'Seattle'],
  // Group C
  ['Brazil', 'Morocco', '2026-06-13', '6:00 PM', -4, 'MetLife Stadium', 'East Rutherford'],
  ['Haiti', 'Scotland', '2026-06-13', '9:00 PM', -4, 'Gillette Stadium', 'Foxborough'],
  ['Scotland', 'Morocco', '2026-06-19', '6:00 PM', -4, 'Gillette Stadium', 'Foxborough'],
  ['Brazil', 'Haiti', '2026-06-19', '8:30 PM', -4, 'Lincoln Financial Field', 'Philadelphia'],
  ['Scotland', 'Brazil', '2026-06-24', '6:00 PM', -4, 'Hard Rock Stadium', 'Miami Gardens'],
  ['Morocco', 'Haiti', '2026-06-24', '6:00 PM', -4, 'Mercedes-Benz Stadium', 'Atlanta'],
  // Group D
  ['United States', 'Paraguay', '2026-06-12', '6:00 PM', -7, 'SoFi Stadium', 'Inglewood'],
  ['Australia', 'Turkey', '2026-06-13', '9:00 PM', -7, 'BC Place', 'Vancouver'],
  ['United States', 'Australia', '2026-06-19', '12:00 PM', -7, 'Lumen Field', 'Seattle'],
  ['Turkey', 'Paraguay', '2026-06-19', '8:00 PM', -7, "Levi's Stadium", 'Santa Clara'],
  ['Turkey', 'United States', '2026-06-25', '7:00 PM', -7, 'SoFi Stadium', 'Inglewood'],
  ['Paraguay', 'Australia', '2026-06-25', '7:00 PM', -7, "Levi's Stadium", 'Santa Clara'],
  // Group E
  ['Germany', 'Curacao', '2026-06-14', '12:00 PM', -5, 'NRG Stadium', 'Houston'],
  ['Ivory Coast', 'Ecuador', '2026-06-14', '7:00 PM', -4, 'Lincoln Financial Field', 'Philadelphia'],
  ['Germany', 'Ivory Coast', '2026-06-20', '4:00 PM', -4, 'BMO Field', 'Toronto'],
  ['Ecuador', 'Curacao', '2026-06-20', '7:00 PM', -5, 'Arrowhead Stadium', 'Kansas City'],
  ['Curacao', 'Ivory Coast', '2026-06-25', '4:00 PM', -4, 'Lincoln Financial Field', 'Philadelphia'],
  ['Ecuador', 'Germany', '2026-06-25', '4:00 PM', -4, 'MetLife Stadium', 'East Rutherford'],
  // Group F
  ['Netherlands', 'Japan', '2026-06-14', '3:00 PM', -5, 'AT&T Stadium', 'Arlington'],
  ['Sweden', 'Tunisia', '2026-06-14', '8:00 PM', -6, 'Estadio BBVA', 'Guadalupe'],
  ['Netherlands', 'Sweden', '2026-06-20', '12:00 PM', -5, 'NRG Stadium', 'Houston'],
  ['Tunisia', 'Japan', '2026-06-20', '10:00 PM', -6, 'Estadio BBVA', 'Guadalupe'],
  ['Japan', 'Sweden', '2026-06-25', '6:00 PM', -5, 'AT&T Stadium', 'Arlington'],
  ['Tunisia', 'Netherlands', '2026-06-25', '6:00 PM', -5, 'Arrowhead Stadium', 'Kansas City'],
  // Group G
  ['Iran', 'New Zealand', '2026-06-15', '6:00 PM', -7, 'SoFi Stadium', 'Inglewood'],
  ['Belgium', 'Egypt', '2026-06-15', '12:00 PM', -7, 'Lumen Field', 'Seattle'],
  ['Belgium', 'Iran', '2026-06-21', '12:00 PM', -7, 'SoFi Stadium', 'Inglewood'],
  ['New Zealand', 'Egypt', '2026-06-21', '6:00 PM', -7, 'BC Place', 'Vancouver'],
  ['Egypt', 'Iran', '2026-06-26', '8:00 PM', -7, 'Lumen Field', 'Seattle'],
  ['New Zealand', 'Belgium', '2026-06-26', '8:00 PM', -7, 'BC Place', 'Vancouver'],
  // Group H
  ['Spain', 'Cape Verde', '2026-06-15', '12:00 PM', -4, 'Mercedes-Benz Stadium', 'Atlanta'],
  ['Saudi Arabia', 'Uruguay', '2026-06-15', '6:00 PM', -4, 'Hard Rock Stadium', 'Miami Gardens'],
  ['Spain', 'Saudi Arabia', '2026-06-21', '12:00 PM', -4, 'Mercedes-Benz Stadium', 'Atlanta'],
  ['Uruguay', 'Cape Verde', '2026-06-21', '6:00 PM', -4, 'Hard Rock Stadium', 'Miami Gardens'],
  ['Cape Verde', 'Saudi Arabia', '2026-06-26', '7:00 PM', -5, 'NRG Stadium', 'Houston'],
  ['Uruguay', 'Spain', '2026-06-26', '6:00 PM', -6, 'Estadio Akron', 'Zapopan'],
  // Group I
  ['France', 'Senegal', '2026-06-16', '3:00 PM', -4, 'MetLife Stadium', 'East Rutherford'],
  ['Iraq', 'Norway', '2026-06-16', '6:00 PM', -4, 'Gillette Stadium', 'Foxborough'],
  ['France', 'Iraq', '2026-06-22', '5:00 PM', -4, 'Lincoln Financial Field', 'Philadelphia'],
  ['Norway', 'Senegal', '2026-06-22', '8:00 PM', -4, 'MetLife Stadium', 'East Rutherford'],
  ['Norway', 'France', '2026-06-26', '3:00 PM', -4, 'Gillette Stadium', 'Foxborough'],
  ['Senegal', 'Iraq', '2026-06-26', '3:00 PM', -4, 'BMO Field', 'Toronto'],
  // Group J
  ['Argentina', 'Algeria', '2026-06-16', '8:00 PM', -5, 'Arrowhead Stadium', 'Kansas City'],
  ['Austria', 'Jordan', '2026-06-16', '9:00 PM', -7, "Levi's Stadium", 'Santa Clara'],
  ['Argentina', 'Austria', '2026-06-22', '12:00 PM', -5, 'AT&T Stadium', 'Arlington'],
  ['Jordan', 'Algeria', '2026-06-22', '8:00 PM', -7, "Levi's Stadium", 'Santa Clara'],
  ['Algeria', 'Austria', '2026-06-27', '9:00 PM', -5, 'Arrowhead Stadium', 'Kansas City'],
  ['Jordan', 'Argentina', '2026-06-27', '9:00 PM', -5, 'AT&T Stadium', 'Arlington'],
  // Group K
  ['Portugal', 'DR Congo', '2026-06-17', '12:00 PM', -5, 'NRG Stadium', 'Houston'],
  ['Uzbekistan', 'Colombia', '2026-06-17', '8:00 PM', -6, 'Estadio Azteca', 'Mexico City'],
  ['Portugal', 'Uzbekistan', '2026-06-23', '12:00 PM', -5, 'NRG Stadium', 'Houston'],
  ['Colombia', 'DR Congo', '2026-06-23', '8:00 PM', -6, 'Estadio Akron', 'Zapopan'],
  ['Colombia', 'Portugal', '2026-06-27', '7:30 PM', -4, 'Hard Rock Stadium', 'Miami Gardens'],
  ['DR Congo', 'Uzbekistan', '2026-06-27', '7:30 PM', -4, 'Mercedes-Benz Stadium', 'Atlanta'],
  // Group L
  ['England', 'Croatia', '2026-06-17', '3:00 PM', -5, 'AT&T Stadium', 'Arlington'],
  ['Ghana', 'Panama', '2026-06-17', '7:00 PM', -4, 'BMO Field', 'Toronto'],
  ['England', 'Ghana', '2026-06-23', '4:00 PM', -4, 'Gillette Stadium', 'Foxborough'],
  ['Panama', 'Croatia', '2026-06-23', '7:00 PM', -4, 'BMO Field', 'Toronto'],
  ['Panama', 'England', '2026-06-27', '5:00 PM', -4, 'MetLife Stadium', 'East Rutherford'],
  ['Croatia', 'Ghana', '2026-06-27', '5:00 PM', -4, 'Lincoln Financial Field', 'Philadelphia'],
];

const ALIAS = { 'united states': 'usa' };

function norm(s) {
  const n = String(s)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return ALIAS[n] || n;
}

const pairKey = (a, b) => [norm(a), norm(b)].sort().join('|');

/** Convert "2026-06-11" + "8:00 PM" + offset(-6) to a UTC ISO string. */
function toUTC(date, localTime, offsetHours) {
  const [y, mo, d] = date.split('-').map(Number);
  const m = localTime.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) throw new Error(`Bad time: ${localTime}`);
  let hour = Number(m[1]) % 12;
  if (/PM/i.test(m[3])) hour += 12;
  const minute = Number(m[2]);
  // local = UTC + offset  =>  UTC = local - offset
  const ms = Date.UTC(y, mo - 1, d, hour - offsetHours, minute, 0);
  return new Date(ms).toISOString().replace('.000Z', 'Z');
}

function main() {
  const picks = JSON.parse(fs.readFileSync(PICKS, 'utf8'));
  const byPair = new Map();
  for (const g of picks.games) byPair.set(pairKey(g.home, g.away), g.id);

  const entries = {};
  const unmatched = [];
  // ROWS are ordered by group (A–L), 6 matches each, so the group letter is
  // derivable from the row index.
  ROWS.forEach(([home, away, date, time, off, venue, city], i) => {
    const id = byPair.get(pairKey(home, away));
    if (!id) {
      unmatched.push(`${home} vs ${away}`);
      return;
    }
    const group = String.fromCharCode(65 + Math.floor(i / 6));
    entries[id] = { kickoffUTC: toUTC(date, time, off), venue, city, group };
  });

  if (unmatched.length) {
    console.error(`Unmatched (${unmatched.length}):\n  ` + unmatched.join('\n  '));
    process.exit(1);
  }
  if (ROWS.length !== 72) {
    console.error(`Expected 72 rows, got ${ROWS.length}`);
    process.exit(1);
  }

  const lines = Object.keys(entries)
    .map(Number)
    .sort((a, b) => a - b)
    .map((id) => {
      const e = entries[id];
      return `  ${id}: { kickoffUTC: '${e.kickoffUTC}', venue: ${JSON.stringify(e.venue)}, city: ${JSON.stringify(e.city)}, group: '${e.group}' },`;
    });

  const out =
    `// AUTO-GENERATED by scripts/build-group-schedule.js — do not edit by hand.\n` +
    `// Group-stage kickoff times (UTC) and venues, keyed by picks.json game id.\n\n` +
    `export interface GroupScheduleEntry {\n  kickoffUTC: string;\n  venue: string;\n  city: string;\n  group: string;\n}\n\n` +
    `export const GROUP_SCHEDULE: Record<number, GroupScheduleEntry> = {\n${lines.join('\n')}\n};\n`;

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, out, 'utf8');
  console.log(`Wrote ${OUT} with ${lines.length} games.`);
}

main();
