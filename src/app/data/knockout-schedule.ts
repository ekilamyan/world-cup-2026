import { Game } from '../models';

/**
 * Fixed knockout schedule for the 2026 FIFA World Cup (official FIFA match
 * numbers 73–104, third-place match 103 excluded — not part of the pool).
 *
 * `id` = FIFA match number, so these never collide with the 1–72 group games.
 * `kickoffUTC` is the absolute kickoff instant; the UI renders it in PT.
 * Teams (`home`/`away`) are blank until the admin sets each matchup, since the
 * bracket isn't known until the group stage finishes. `pairing` is the bracket
 * descriptor shown in the meantime.
 */
function ko(
  id: number,
  stage: Game['stage'],
  kickoffUTC: string,
  venue: string,
  city: string,
  pairing: string,
): Game {
  return { id, stage, matchNumber: id, kickoffUTC, venue, city, pairing, label: pairing, home: '', away: '' };
}

export const KNOCKOUT_SCHEDULE: Game[] = [
  // ---- Round of 32 ----
  ko(73, 'r32', '2026-06-28T19:00:00Z', 'SoFi Stadium', 'Inglewood', '2A vs 2B'),
  ko(74, 'r32', '2026-06-29T20:30:00Z', 'Gillette Stadium', 'Foxborough', '1E vs 3A/B/C/D/F'),
  ko(76, 'r32', '2026-06-29T17:00:00Z', 'NRG Stadium', 'Houston', '1C vs 2F'),
  ko(75, 'r32', '2026-06-30T01:00:00Z', 'Estadio BBVA', 'Guadalupe', '1F vs 2C'),
  ko(78, 'r32', '2026-06-30T17:00:00Z', 'AT&T Stadium', 'Arlington', '2E vs 2I'),
  ko(77, 'r32', '2026-06-30T21:00:00Z', 'MetLife Stadium', 'East Rutherford', '1I vs 3C/D/F/G/H'),
  ko(79, 'r32', '2026-07-01T01:00:00Z', 'Estadio Azteca', 'Mexico City', '1A vs 3C/E/F/H/I'),
  ko(80, 'r32', '2026-07-01T16:00:00Z', 'Mercedes-Benz Stadium', 'Atlanta', '1L vs 3E/H/I/J/K'),
  ko(82, 'r32', '2026-07-01T20:00:00Z', 'Lumen Field', 'Seattle', '1G vs 3A/E/H/I/J'),
  ko(81, 'r32', '2026-07-02T00:00:00Z', "Levi's Stadium", 'Santa Clara', '1D vs 3B/E/F/I/J'),
  ko(84, 'r32', '2026-07-02T19:00:00Z', 'SoFi Stadium', 'Inglewood', '1H vs 2J'),
  ko(83, 'r32', '2026-07-02T23:00:00Z', 'BMO Field', 'Toronto', '2K vs 2L'),
  ko(85, 'r32', '2026-07-03T03:00:00Z', 'BC Place', 'Vancouver', '1B vs 3E/F/G/I/J'),
  ko(88, 'r32', '2026-07-03T18:00:00Z', 'AT&T Stadium', 'Arlington', '2D vs 2G'),
  ko(86, 'r32', '2026-07-03T22:00:00Z', 'Hard Rock Stadium', 'Miami Gardens', '1J vs 2H'),
  ko(87, 'r32', '2026-07-04T01:30:00Z', 'Arrowhead Stadium', 'Kansas City', '1K vs 3D/E/I/J/L'),

  // ---- Round of 16 ----
  ko(90, 'r16', '2026-07-04T17:00:00Z', 'NRG Stadium', 'Houston', 'W73 vs W75'),
  ko(89, 'r16', '2026-07-04T21:00:00Z', 'Lincoln Financial Field', 'Philadelphia', 'W74 vs W77'),
  ko(91, 'r16', '2026-07-05T20:00:00Z', 'MetLife Stadium', 'East Rutherford', 'W76 vs W78'),
  ko(92, 'r16', '2026-07-06T00:00:00Z', 'Estadio Azteca', 'Mexico City', 'W79 vs W80'),
  ko(93, 'r16', '2026-07-06T19:00:00Z', 'AT&T Stadium', 'Arlington', 'W83 vs W84'),
  ko(94, 'r16', '2026-07-07T00:00:00Z', 'Lumen Field', 'Seattle', 'W81 vs W82'),
  ko(95, 'r16', '2026-07-07T16:00:00Z', 'Mercedes-Benz Stadium', 'Atlanta', 'W86 vs W88'),
  ko(96, 'r16', '2026-07-07T20:00:00Z', 'BC Place', 'Vancouver', 'W85 vs W87'),

  // ---- Quarterfinals ----
  ko(97, 'qf', '2026-07-09T20:00:00Z', 'Gillette Stadium', 'Foxborough', 'W89 vs W90'),
  ko(98, 'qf', '2026-07-10T19:00:00Z', 'SoFi Stadium', 'Inglewood', 'W93 vs W94'),
  ko(99, 'qf', '2026-07-11T21:00:00Z', 'Hard Rock Stadium', 'Miami Gardens', 'W91 vs W92'),
  ko(100, 'qf', '2026-07-12T01:00:00Z', 'Arrowhead Stadium', 'Kansas City', 'W95 vs W96'),

  // ---- Semifinals ----
  ko(101, 'sf', '2026-07-14T19:00:00Z', 'AT&T Stadium', 'Arlington', 'W97 vs W98'),
  ko(102, 'sf', '2026-07-15T19:00:00Z', 'Mercedes-Benz Stadium', 'Atlanta', 'W99 vs W100'),

  // ---- Final ----
  ko(104, 'final', '2026-07-19T19:00:00Z', 'MetLife Stadium', 'East Rutherford', 'W101 vs W102'),
];
