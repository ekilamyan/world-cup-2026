import { Component, computed, inject, signal } from '@angular/core';
import { DataService } from '../../services/data.service';
import { isPickCorrect } from '../../services/scoring';
import { gameLabel } from '../../models';

interface PickRow {
  label: string;
  pick: string;
  result: string;
  status: 'correct' | 'wrong' | 'pending' | 'nopick';
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

  protected readonly breakdown = computed<PickRow[]>(() => {
    const name = this.expanded();
    if (!name) return [];
    const participant = this.data.participants().find((p) => p.name === name);
    if (!participant) return [];
    const results = this.data.results();
    return this.data
      .games()
      .filter((g) => participant.picks[g.id])
      .map((g) => {
        const pick = participant.picks[g.id] ?? '';
        const result = results[g.id] ?? '';
        let status: PickRow['status'];
        if (!result) status = 'pending';
        else status = isPickCorrect(pick, result) ? 'correct' : 'wrong';
        return { label: gameLabel(g), pick, result: result || '—', status };
      });
  });

  protected toggle(name: string): void {
    this.expanded.update((current) => (current === name ? null : name));
  }
}
