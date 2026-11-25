import type { T } from "@/lib/i18n";

const TZ = process.env.NEXT_PUBLIC_TIMEZONE ?? "Asia/Qyzylorda";
// Optional last argument `t` (from getT/useT) localises the output; without it: English.
const intl = (t?: T) => (t && t.locale !== "en" ? "ru-RU" : "en-GB");
const tr = (t: T | undefined, s: string, vars?: Record<string, number>) =>
  t ? t(s, vars) : s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars?.[k] ?? ""));

export function formatDate(iso: string | null | undefined, withTime = true, t?: T): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(intl(t), {
    timeZone: TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function formatTime(iso: string | null | undefined, t?: T): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(intl(t), { timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/** 125 → "2:05", 3725 → "1:02:05" */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(sec).padStart(2, "0")}`;
}

export function formatDuration(seconds: number | null | undefined, t?: T): string {
  if (seconds == null) return "—";
  const s = Math.round(seconds);
  if (s < 60) return tr(t, "{s} sec", { s });
  const m = Math.floor(s / 60);
  if (m < 60) return s % 60 ? tr(t, "{m} min {s} sec", { m, s: s % 60 }) : tr(t, "{m} min", { m });
  return tr(t, "{h} h {m} min", { h: Math.floor(m / 60), m: m % 60 });
}

export function formatPercent(v: number | null | undefined, digits = 0): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${Number(v).toFixed(digits)}%`;
}

export function formatMark(v: number | string | null | undefined): string {
  if (v == null) return "—";
  const n = Number(v);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function relativeTime(iso: string | null | undefined, t?: T): string {
  if (!iso) return tr(t, "never");
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return tr(t, "just now");
  if (diff < 3600) return tr(t, "{n} min ago", { n: Math.floor(diff / 60) });
  if (diff < 86400) return tr(t, "{n} h ago", { n: Math.floor(diff / 3600) });
  if (diff < 86400 * 30) return tr(t, "{n} d ago", { n: Math.floor(diff / 86400) });
  return formatDate(iso, false, t);
}

/** Current time in ms (wrapped so server components stay lint-pure). */
export function nowMs(): number {
  return Date.now();
}
