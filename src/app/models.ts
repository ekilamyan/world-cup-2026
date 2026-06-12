export type Stage = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final';

export interface StageInfo {
  key: Stage;
  /** Full name, e.g. "Round of 32". */
  label: string;
  /** Short tab label, e.g. "R32". */
  short: string;
  /** Points awarded per correct pick in this stage. */
  points: number;
  /** Knockout stages have admin-selected matchups; group stage is fixed. */
  knockout: boolean;
}

/** Scoring + ordering for every stage (per the pool flyer). */
export const STAGES: StageInfo[] = [
  { key: 'group', label: 'Group Stage', short: 'Group', points: 1, knockout: false },
  { key: 'r32', label: 'Round of 32', short: 'R32', points: 2, knockout: true },
  { key: 'r16', label: 'Round of 16', short: 'R16', points: 3, knockout: true },
  { key: 'qf', label: 'Quarterfinals', short: 'QF', points: 4, knockout: true },
  { key: 'sf', label: 'Semifinals', short: 'SF', points: 5, knockout: true },
  { key: 'final', label: 'Final', short: 'Final', points: 6, knockout: true },
];

export function stageInfo(stage: Stage): StageInfo {
  return STAGES.find((s) => s.key === stage) ?? STAGES[0];
}

export interface Game {
  id: number;
  stage: Stage;
  /** "Home vs. Away" once known; for knockout it's the bracket pairing until teams are set. */
  label: string;
  home: string;
  away: string;
  // --- Knockout scheduling (fixed/known in advance) ---
  /** FIFA match number (e.g. 73). */
  matchNumber?: number;
  /** Kickoff as an absolute UTC instant (ISO string); displayed in PT. */
  kickoffUTC?: string;
  venue?: string;
  city?: string;
  /** Group letter (A–L) for group-stage games. */
  group?: string;
  /** Bracket descriptor, e.g. "1A vs 3C/E/F/H/I" or "W74 vs W77". */
  pairing?: string;
}

/** Group games as they come out of the Excel conversion (no stage/schedule). */
export interface RawGame {
  id: number;
  label: string;
  home: string;
  away: string;
}

export interface Participant {
  name: string;
  /** gameId (as string) -> picked team name or "Draw" */
  picks: Record<string, string>;
}

export interface PicksData {
  games: RawGame[];
  participants: Participant[];
}

/** gameId (as string) -> result: a team name or "Draw". Absent = not played yet. */
export type ResultsMap = Record<string, string>;

/** gameId (as string) -> the two teams selected for a knockout matchup. */
export type MatchupsMap = Record<string, { home: string; away: string }>;

export interface LeaderboardRow {
  rank: number;
  name: string;
  points: number;
  /** games this participant got right */
  correct: number;
  /** games that have a recorded result so far */
  played: number;
}

export const DRAW = 'Draw';

/** Best display label for a game: real teams if known, else the bracket pairing. */
export function gameLabel(g: Game): string {
  if (g.home && g.away) return `${g.home} vs. ${g.away}`;
  return g.pairing || g.label || `Match ${g.matchNumber ?? g.id}`;
}
