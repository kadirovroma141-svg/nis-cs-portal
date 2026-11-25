// Time on the site (table usage_minutes, migration 20261124000031): helpers for the teacher's report.

export type UsageRow = { user_id: string; day: string; minutes: number };

/** Today's date in Kazakhstan (UTC+5) as YYYY-MM-DD — the same day boundary as ping_usage(). */
export function kzToday(now: number): string {
  return new Date(now + 5 * 3600_000).toISOString().slice(0, 10);
}

/** YYYY-MM-DD shifted by n days. */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Total minutes per user. */
export function minutesByUser(rows: UsageRow[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) m.set(r.user_id, (m.get(r.user_id) ?? 0) + r.minutes);
  return m;
}

/** Total minutes per day, every day from `from` to `to` included (missing days = 0), only for the given users. */
export function minutesByDay(rows: UsageRow[], from: string, to: string, users?: Set<string>): { day: string; minutes: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) if (!users || users.has(r.user_id)) m.set(r.day, (m.get(r.day) ?? 0) + r.minutes);
  const out: { day: string; minutes: number }[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push({ day: d, minutes: m.get(d) ?? 0 });
  return out;
}

/** "12 h 05 min" / "45 min" — numbers only; the caller translates the units. */
export function splitHours(minutes: number): { h: number; m: number } {
  const total = Math.max(0, Math.round(minutes));
  return { h: Math.floor(total / 60), m: total % 60 };
}
