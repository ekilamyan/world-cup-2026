import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Flag } from '../../flag/flag';
import { DataService } from '../../services/data.service';
import { isPickCorrect, normalizeTeam } from '../../services/scoring';
import { gameLabel, STAGES, Participant, Stage } from '../../models';

interface PickRow {
  id: number;
  matchup: string;
  pick: string;
  result: string;
  status: 'correct' | 'wrong' | 'pending';
  /** Points earned for this pick (0 unless correct). */
  points: number;
}

interface StageGroup {
  key: Stage;
  label: string;
  short: string;
  /** Points per correct pick in this round. */
  points: number;
  picks: PickRow[];
  /** Total points earned in this round so far. */
  earned: number;
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

  /**
   * The player's picks grouped by stage, ordered latest round first (so the
   * Round of 32 sits above the group stage). Stages with no picks are dropped.
   */
  protected readonly groups = computed<StageGroup[]>(() => {
    const m = this.match();
    if (!m) return [];
    const results = this.data.results();
    const games = this.data.games();

    return [...STAGES]
      .reverse()
      .map((stage) => {
        const picks: PickRow[] = games
          .filter((g) => g.stage === stage.key && m.picks[g.id])
          .map((g) => {
            const pick = m.picks[g.id] ?? '';
            const result = results[g.id] ?? '';
            let status: PickRow['status'];
            if (!result) status = 'pending';
            else status = isPickCorrect(pick, result) ? 'correct' : 'wrong';
            const points = status === 'correct' ? stage.points : 0;
            return { id: g.id, matchup: gameLabel(g), pick, result, status, points };
          });
        const earned = picks.reduce((n, p) => n + p.points, 0);
        return { key: stage.key, label: stage.label, short: stage.short, points: stage.points, picks, earned };
      })
      .filter((grp) => grp.picks.length > 0);
  });

  /** Stages the user has toggled away from their default open/closed state. */
  private readonly stageOverrides = signal<Set<Stage>>(new Set());

  /** Whether a round's picks are shown. Group stage is collapsed by default. */
  protected isStageOpen(key: Stage): boolean {
    const defaultOpen = key !== 'group';
    return this.stageOverrides().has(key) ? !defaultOpen : defaultOpen;
  }

  protected toggleStage(key: Stage): void {
    this.stageOverrides.update((set) => {
      const next = new Set(set);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  protected readonly totalPicks = computed(() =>
    this.groups().reduce((n, g) => n + g.picks.length, 0),
  );

  protected choose(name: string): void {
    this.query.set(name);
  }
}
