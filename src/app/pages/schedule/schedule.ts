import { Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Flag } from '../../flag/flag';
import { DataService } from '../../services/data.service';
import { gameLabel, stageInfo } from '../../models';
import { dayKey, formatDayLabel, formatTime } from '../../util/datetime';

interface SchedGame {
  id: number;
  key: string;
  dayLabel: string;
  time: string;
  label: string;
  home: string;
  away: string;
  venue: string;
  city: string;
  stageShort: string;
  result: string;
  status: 'done' | 'live' | 'upcoming';
  isNext: boolean;
}

interface Day {
  key: string;
  label: string;
  games: SchedGame[];
}

@Component({
  selector: 'app-schedule',
  imports: [NgTemplateOutlet, Flag],
  templateUrl: './schedule.html',
  styleUrl: './schedule.scss',
})
export class Schedule {
  protected readonly data = inject(DataService);

  // Captured once on load; "next"/"live" markers are relative to page open.
  private readonly nowMs = signal(Date.now());

  /** All games as flat rows, status-tagged, sorted by kickoff. */
  private readonly rows = computed<SchedGame[]>(() => {
    const results = this.data.results();
    const now = this.nowMs();

    const games = this.data
      .games()
      .filter((g) => g.kickoffUTC)
      .sort((a, b) => a.kickoffUTC!.localeCompare(b.kickoffUTC!));

    // The next not-yet-played match (earliest upcoming with no result).
    const nextId = games.find((g) => new Date(g.kickoffUTC!).getTime() > now && !results[g.id])?.id;

    return games.map((g) => {
      const kickoff = new Date(g.kickoffUTC!).getTime();
      const result = results[g.id] ?? '';
      const status: SchedGame['status'] = result ? 'done' : kickoff <= now ? 'live' : 'upcoming';
      return {
        id: g.id,
        key: dayKey(g.kickoffUTC),
        dayLabel: formatDayLabel(g.kickoffUTC),
        time: formatTime(g.kickoffUTC),
        label: gameLabel(g),
        home: g.home,
        away: g.away,
        venue: g.venue ?? '',
        city: g.city ?? '',
        stageShort: g.group ? `Group ${g.group}` : stageInfo(g.stage).short,
        result,
        status,
        isNext: g.id === nextId,
      };
    });
  });

  /** Upcoming + in-play games, grouped by day (earliest first). */
  protected readonly upcomingDays = computed<Day[]>(() =>
    groupByDay(this.rows().filter((r) => r.status !== 'done')),
  );

  /** Finished games, grouped by day, most recent first. */
  protected readonly doneDays = computed<Day[]>(() => {
    const days = groupByDay(this.rows().filter((r) => r.status === 'done'));
    days.reverse();
    for (const d of days) d.games.reverse();
    return days;
  });
}

function groupByDay(rows: SchedGame[]): Day[] {
  const byDay = new Map<string, Day>();
  for (const r of rows) {
    if (!byDay.has(r.key)) byDay.set(r.key, { key: r.key, label: r.dayLabel, games: [] });
    byDay.get(r.key)!.games.push(r);
  }
  return [...byDay.values()];
}
