import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Game,
  LeaderboardRow,
  MatchupsMap,
  Participant,
  PicksData,
  ResultsMap,
  Stage,
} from '../models';
import { KNOCKOUT_SCHEDULE } from '../data/knockout-schedule';
import { GROUP_SCHEDULE } from '../data/group-schedule';
import { computeLeaderboard, playedCount } from './scoring';

@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient);

  /** Group games come from the (locked) Excel conversion. */
  readonly groupGames = signal<Game[]>([]);
  readonly participants = signal<Participant[]>([]);
  readonly results = signal<ResultsMap>({});
  /** Admin-selected teams for knockout matchups (lives in the Google Sheet). */
  readonly matchups = signal<MatchupsMap>({});

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly ready = signal(false);

  readonly hasBackend = !!environment.appsScriptUrl;

  /** All games: locked group games + knockout games with any selected teams merged in. */
  readonly games = computed<Game[]>(() => {
    const map = this.matchups();
    const ko = KNOCKOUT_SCHEDULE.map((g) => {
      const m = map[g.id];
      return m ? { ...g, home: m.home || '', away: m.away || '' } : g;
    });
    return [...this.groupGames(), ...ko];
  });

  /** Distinct team names (from the group stage) for the matchup dropdowns. */
  readonly teams = computed<string[]>(() => {
    const set = new Set<string>();
    for (const g of this.groupGames()) {
      if (g.home) set.add(g.home);
      if (g.away) set.add(g.away);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  });

  readonly leaderboard = computed<LeaderboardRow[]>(() =>
    computeLeaderboard(this.games(), this.participants(), this.results()),
  );

  readonly gamesPlayed = computed(() => playedCount(this.games(), this.results()));

  gamesForStage(stage: Stage): Game[] {
    return this.games().filter((g) => g.stage === stage);
  }

  /** Count of games in a stage that have a recorded result. */
  scoredInStage(stage: Stage): number {
    const r = this.results();
    return this.gamesForStage(stage).reduce((n, g) => (r[g.id] ? n + 1 : n), 0);
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const picks = await firstValueFrom(this.http.get<PicksData>('picks.json'));
      this.groupGames.set(
        (picks.games ?? []).map((g) => ({ ...g, stage: 'group' as const, ...GROUP_SCHEDULE[g.id] })),
      );
      this.participants.set(picks.participants ?? []);
      this.ready.set(true);
      await this.refreshResults();
    } catch (err) {
      console.error(err);
      this.error.set('Could not load pool data. Please refresh.');
    } finally {
      this.loading.set(false);
    }
  }

  /** Fetch latest results AND knockout matchups from the Apps Script endpoint. */
  async refreshResults(): Promise<void> {
    if (!this.hasBackend) return;
    try {
      const text = await firstValueFrom(
        this.http.get(environment.appsScriptUrl, { responseType: 'text' }),
      );
      const data = JSON.parse(text) as {
        results?: ResultsMap;
        matchups?: MatchupsMap;
      } & ResultsMap;
      this.results.set(normalizeResults(data.results ?? (data as ResultsMap)));
      this.matchups.set(normalizeMatchups(data.matchups));
    } catch (err) {
      console.error('Failed to load results', err);
      this.error.set('Could not reach the results database.');
    }
  }

  async verifyPasscode(passcode: string): Promise<boolean> {
    if (!this.hasBackend) throw new Error('no-backend');
    const res = await this.post({ action: 'verify', passcode });
    return res.ok === true;
  }

  /** Save (or clear, when result is '') a game's result. Passcode checked server-side. */
  async saveResult(gameId: number, result: string, passcode: string): Promise<boolean> {
    const res = await this.post({ passcode, gameId: String(gameId), result });
    if (!res.ok) throw new Error(res.error || 'Save failed');
    this.results.update((r) => {
      const next = { ...r };
      if (result) next[gameId] = result;
      else delete next[gameId];
      return next;
    });
    return true;
  }

  /** Set the two teams for a knockout matchup. Either may be '' (not chosen yet). */
  async saveMatchup(
    gameId: number,
    home: string,
    away: string,
    passcode: string,
  ): Promise<boolean> {
    const res = await this.post({ action: 'matchup', passcode, gameId: String(gameId), home, away });
    if (!res.ok) throw new Error(res.error || 'Save failed');
    this.matchups.update((m) => ({ ...m, [gameId]: { home, away } }));
    return true;
  }

  /** Wipe all results and matchups (testing helper). Passcode checked server-side. */
  async resetAll(passcode: string): Promise<boolean> {
    const res = await this.post({ action: 'reset', passcode });
    if (!res.ok) throw new Error(res.error || 'Reset failed');
    this.results.set({});
    this.matchups.set({});
    return true;
  }

  /** POST to the Apps Script as text/plain to avoid a CORS preflight. */
  private async post(body: Record<string, string>): Promise<{ ok: boolean; error?: string }> {
    if (!this.hasBackend) {
      this.error.set('No results database configured (appsScriptUrl is empty).');
      return { ok: false, error: 'no-backend' };
    }
    const text = await firstValueFrom(
      this.http.post(environment.appsScriptUrl, JSON.stringify(body), {
        responseType: 'text',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      }),
    );
    return JSON.parse(text) as { ok: boolean; error?: string };
  }
}

function normalizeResults(map: ResultsMap | undefined): ResultsMap {
  const out: ResultsMap = {};
  if (!map) return out;
  for (const [k, v] of Object.entries(map)) {
    const val = (v ?? '').toString().trim();
    if (val) out[String(k)] = val;
  }
  return out;
}

function normalizeMatchups(map: MatchupsMap | undefined): MatchupsMap {
  const out: MatchupsMap = {};
  if (!map) return out;
  for (const [k, v] of Object.entries(map)) {
    if (!v) continue;
    const home = (v.home ?? '').toString().trim();
    const away = (v.away ?? '').toString().trim();
    if (home || away) out[String(k)] = { home, away };
  }
  return out;
}
