import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Flag } from '../../flag/flag';
import { DataService } from '../../services/data.service';
import { isPickCorrect, normalizeTeam } from '../../services/scoring';
import { gameLabel, STAGES, Participant } from '../../models';

interface PickRow {
  id: number;
  matchup: string;
  pick: string;
  result: string;
  status: 'correct' | 'wrong' | 'pending';
}

interface StageGroup {
  label: string;
  short: string;
  points: number;
  picks: PickRow[];
}

@Component({
  selector: 'app-my-picks',
  imports: [FormsModule, Flag],
  templateUrl: './my-picks.html',
  styleUrl: './my-picks.scss',
})
export class MyPicks {
  protected readonly data = inject(DataService);

  /** What the user has typed into the name box. */
  protected readonly query = signal('');

  /** All participant names, sorted, for the autocomplete datalist. */
  protected readonly allNames = computed(() =>
    this.data
      .participants()
      .map((p) => p.name)
      .sort((a, b) => a.localeCompare(b)),
  );

  /** The participant whose typed name matches exactly (accent/case-insensitive). */
  protected readonly match = computed<Participant | null>(() => {
    const q = normalizeTeam(this.query());
    if (!q) return null;
    return this.data.participants().find((p) => normalizeTeam(p.name) === q) ?? null;
  });

  /** Partial matches to suggest when there's no exact hit yet. */
  protected readonly suggestions = computed<string[]>(() => {
    const q = normalizeTeam(this.query());
    if (!q || this.match()) return [];
    return this.allNames()
      .filter((n) => normalizeTeam(n).includes(q))
      .slice(0, 8);
  });

  /** This player's scoreboard line (points / correct), if they exist. */
  protected readonly summary = computed(() => {
    const m = this.match();
    if (!m) return null;
    return this.data.leaderboard().find((r) => r.name === m.name) ?? null;
  });

  /** The player's picks, grouped by stage in flyer order. */
  protected readonly groups = computed<StageGroup[]>(() => {
    const m = this.match();
    if (!m) return [];
    const results = this.data.results();
    const games = this.data.games();

    return STAGES.map((stage) => {
      const picks: PickRow[] = games
        .filter((g) => g.stage === stage.key && m.picks[g.id])
        .map((g) => {
          const pick = m.picks[g.id] ?? '';
          const result = results[g.id] ?? '';
          let status: PickRow['status'];
          if (!result) status = 'pending';
          else status = isPickCorrect(pick, result) ? 'correct' : 'wrong';
          return { id: g.id, matchup: gameLabel(g), pick, result, status };
        });
      return { label: stage.label, short: stage.short, points: stage.points, picks };
    }).filter((grp) => grp.picks.length > 0);
  });

  protected readonly totalPicks = computed(() =>
    this.groups().reduce((n, g) => n + g.picks.length, 0),
  );

  protected choose(name: string): void {
    this.query.set(name);
  }
}
