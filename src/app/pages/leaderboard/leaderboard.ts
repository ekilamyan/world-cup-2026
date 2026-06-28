import { Component, computed, inject, signal } from '@angular/core';
import { DataService } from '../../services/data.service';
import { isPickCorrect } from '../../services/scoring';
import { gameLabel, STAGES, Stage } from '../../models';

interface PickRow {
  label: string;
  pick: string;
  result: string;
  status: 'correct' | 'wrong' | 'pending' | 'nopick';
}

interface StageGroup {
  key: Stage;
  label: string;
  picks: PickRow[];
}

@Component({
  selector: 'app-leaderboard',
  imports: [],
  templateUrl: './leaderboard.html',
  styleUrl: './leaderboard.scss',
})
export class Leaderboard {
  protected readonly data = inject(DataService);

  /** Name of the participant whose picks are expanded, or null. */
  protected readonly expanded = signal<string | null>(null);

  /** Stages the user has toggled away from their default open/closed state. */
  private readonly stageOverrides = signal<Set<Stage>>(new Set());

  /**
   * The expanded player's picks grouped by stage, latest round first (so the
   * Round of 32 sits above the group stage). Stages with no picks are dropped.
   */
  protected readonly groups = computed<StageGroup[]>(() => {
    const name = this.expanded();
    if (!name) return [];
    const participant = this.data.participants().find((p) => p.name === name);
    if (!participant) return [];
    const results = this.data.results();
    const games = this.data.games();

    return [...STAGES]
      .reverse()
      .map((stage) => {
        const picks: PickRow[] = games
          .filter((g) => g.stage === stage.key && participant.picks[g.id])
          .map((g) => {
            const pick = participant.picks[g.id] ?? '';
            const result = results[g.id] ?? '';
            let status: PickRow['status'];
            if (!result) status = 'pending';
            else status = isPickCorrect(pick, result) ? 'correct' : 'wrong';
            return { label: gameLabel(g), pick, result: result || '—', status };
          });
        return { key: stage.key, label: stage.label, picks };
      })
      .filter((grp) => grp.picks.length > 0);
  });

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

  protected toggle(name: string): void {
    this.stageOverrides.set(new Set()); // reset rounds to their defaults for the newly opened player
    this.expanded.update((current) => (current === name ? null : name));
  }
}
