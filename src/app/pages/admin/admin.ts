import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Flag } from '../../flag/flag';
import { DataService } from '../../services/data.service';
import { DRAW, Game, STAGES, Stage, gameLabel, stageInfo } from '../../models';
import { formatKickoff } from '../../util/datetime';

@Component({
  selector: 'app-admin',
  imports: [FormsModule, Flag],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class Admin {
  protected readonly data = inject(DataService);
  protected readonly DRAW = DRAW;
  protected readonly stages = STAGES;
  protected readonly gameLabel = gameLabel;
  protected readonly formatKickoff = formatKickoff;

  protected readonly passcode = signal('');
  protected readonly unlocked = signal(false);
  protected readonly checking = signal(false);
  protected readonly unlockError = signal<string | null>(null);

  protected readonly activeStage = signal<Stage>('group');
  protected readonly filter = signal('');
  protected readonly savingId = signal<number | null>(null);
  protected readonly message = signal<string | null>(null);
  protected readonly messageOk = signal(true);

  protected readonly isKnockout = computed(() => stageInfo(this.activeStage()).knockout);

  protected readonly stageGames = computed<Game[]>(() => {
    const q = this.filter().trim().toLowerCase();
    const games = this.data.gamesForStage(this.activeStage());
    if (!q) return games;
    return games.filter(
      (g) =>
        gameLabel(g).toLowerCase().includes(q) ||
        (g.pairing ?? '').toLowerCase().includes(q) ||
        (g.city ?? '').toLowerCase().includes(q),
    );
  });

  protected async unlock(): Promise<void> {
    const code = this.passcode().trim();
    if (!code || this.checking()) return;
    if (!this.data.hasBackend) {
      this.unlockError.set('No results database is connected yet.');
      return;
    }
    this.checking.set(true);
    this.unlockError.set(null);
    try {
      if (await this.data.verifyPasscode(code)) {
        this.unlocked.set(true);
      } else {
        this.unlockError.set('Wrong passcode. Try again.');
      }
    } catch {
      this.unlockError.set('Could not reach the server. Check your connection and try again.');
    } finally {
      this.checking.set(false);
    }
  }

  protected selectStage(stage: Stage): void {
    this.activeStage.set(stage);
    this.filter.set('');
    this.message.set(null);
  }

  protected resultFor(game: Game): string {
    return this.data.results()[game.id] ?? '';
  }

  /** Save (or toggle-clear) a game's result. */
  protected async setResult(game: Game, value: string): Promise<void> {
    const next = this.resultFor(game) === value ? '' : value;
    await this.run(game, () => this.data.saveResult(game.id, next, this.passcode()), game);
  }

  /** Set the home (or away) team of a knockout matchup; keeps the other side. */
  protected async setMatchupSide(game: Game, side: 'home' | 'away', team: string): Promise<void> {
    const home = side === 'home' ? team : game.home;
    const away = side === 'away' ? team : game.away;
    await this.run(game, () => this.data.saveMatchup(game.id, home, away, this.passcode()), {
      ...game,
      home,
      away,
    });
    // If a recorded winner is no longer one of the two teams, clear it.
    const result = this.resultFor(game);
    if (result && result !== home && result !== away) {
      await this.data.saveResult(game.id, '', this.passcode()).catch(() => {});
    }
  }

  /** Wipe all results + matchups after a confirmation prompt. */
  protected async resetAll(): Promise<void> {
    if (this.savingId() !== null) return;
    const ok = confirm(
      'Reset the database? This permanently clears ALL results and knockout matchups. This cannot be undone.',
    );
    if (!ok) return;
    this.savingId.set(-1);
    this.message.set(null);
    try {
      await this.data.resetAll(this.passcode());
      this.messageOk.set(true);
      this.message.set('Database reset — all results and matchups cleared.');
    } catch (err) {
      this.messageOk.set(false);
      const msg = err instanceof Error ? err.message : 'Reset failed';
      this.message.set(
        msg === 'unauthorized' ? 'Wrong passcode — check it and try again.' : `Error: ${msg}`,
      );
    } finally {
      this.savingId.set(null);
    }
  }

  /** Shared save wrapper: spinner + success/error messaging. */
  private async run(game: Game, fn: () => Promise<unknown>, labelGame: Game): Promise<void> {
    if (this.savingId() !== null) return;
    this.savingId.set(game.id);
    this.message.set(null);
    try {
      await fn();
      this.messageOk.set(true);
      this.message.set(`Saved: ${gameLabel(labelGame)}`);
    } catch (err) {
      this.messageOk.set(false);
      const msg = err instanceof Error ? err.message : 'Save failed';
      this.message.set(
        msg === 'unauthorized' ? 'Wrong passcode — check it and try again.' : `Error: ${msg}`,
      );
    } finally {
      this.savingId.set(null);
    }
  }
}
