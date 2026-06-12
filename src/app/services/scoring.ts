import { Game, LeaderboardRow, Participant, ResultsMap, stageInfo } from '../models';

/**
 * Normalize a team name for comparison: strip diacritics, collapse whitespace,
 * lowercase. This makes "Curaçao" (as some participants typed it) match the
 * game's "Curacao", and guards against other accent/spacing differences.
 */
export function normalizeTeam(value: string): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** True if a participant's pick matches the recorded result for a game. */
export function isPickCorrect(pick: string | undefined, result: string | undefined): boolean {
  if (!pick || !result) return false;
  return normalizeTeam(pick) === normalizeTeam(result);
}

/** Count of games that currently have a (non-empty) recorded result. */
export function playedCount(games: Game[], results: ResultsMap): number {
  return games.reduce((n, g) => (results[g.id] ? n + 1 : n), 0);
}

/**
 * Build the ranked leaderboard from picks + results.
 * Sorted by points desc, then correct desc, then name asc. Ties share a rank
 * (standard competition ranking: 1, 2, 2, 4).
 */
export function computeLeaderboard(
  games: Game[],
  participants: Participant[],
  results: ResultsMap,
): LeaderboardRow[] {
  const played = playedCount(games, results);

  const scored = participants.map((p) => {
    let correct = 0;
    let points = 0;
    for (const g of games) {
      const result = results[g.id];
      if (result && isPickCorrect(p.picks[g.id], result)) {
        correct++;
        points += stageInfo(g.stage).points;
      }
    }
    return { name: p.name, correct, played, points };
  });

  scored.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.correct !== a.correct) return b.correct - a.correct;
    return a.name.localeCompare(b.name);
  });

  let lastPoints: number | null = null;
  let lastRank = 0;
  return scored.map((row, i) => {
    const rank = lastPoints === row.points ? lastRank : i + 1;
    lastPoints = row.points;
    lastRank = rank;
    return { rank, ...row };
  });
}
