/** Display timezone for all kickoff times across the site. */
const TZ = 'America/Los_Angeles';

const DATE_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

const TIME_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ,
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
});

const TIME_ONLY_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ,
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
});

const DAY_LABEL_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ,
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

// en-CA yields a YYYY-MM-DD string, perfect as a sortable day grouping key.
const DAY_KEY_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** "Sun, Jun 28 · 12:00 PM PDT" — kickoff rendered in Pacific Time. */
export function formatKickoff(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${DATE_FMT.format(d)} · ${TIME_FMT.format(d)}`;
}

/** "12:00 PM PDT" — just the kickoff time in PT. */
export function formatTime(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return TIME_ONLY_FMT.format(d);
}

const TIME_BARE_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ,
  hour: 'numeric',
  minute: '2-digit',
});

/** "12:00 PM" — kickoff time in PT without the timezone label. */
export function formatTimeBare(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return TIME_BARE_FMT.format(d);
}

/** "PDT" / "PST" — the PT timezone abbreviation for a given instant. */
export function tzAbbr(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return TIME_ONLY_FMT.formatToParts(d).find((p) => p.type === 'timeZoneName')?.value ?? '';
}

/** "Sunday, June 28" — full day label in PT, for schedule day headers. */
export function formatDayLabel(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return DAY_LABEL_FMT.format(d);
}

/** "2026-06-28" — PT calendar day, used to group games by day. */
export function dayKey(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return DAY_KEY_FMT.format(d);
}
