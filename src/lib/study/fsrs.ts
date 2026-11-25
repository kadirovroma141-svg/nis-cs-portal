// Compact FSRS-4.5 scheduler (Free Spaced Repetition Scheduler, default
// weights, 90 % desired retention). Three self-ratings are used on the repeat
// site: 1 не вспомнил (Again), 2 с трудом (Hard), 3 легко (Good).
// A missed card comes back 10 minutes later the same day; otherwise the
// interval in days equals the new stability (R = 0.9 at that point).

export type Rating = 1 | 2 | 3;

export type CardState = {
  /** 0 new · 1 learning · 2 review · 3 relearning */
  state: number;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  last_review_at: string | null;
};

export type Scheduled = Omit<CardState, "last_review_at"> & { last_review_at: string; due_at: string };

const W = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755];
const DECAY = -0.5;
const FACTOR = 19 / 81;
const DAY = 86_400_000;
const RELEARN_MS = 10 * 60_000;
const MAX_DAYS = 365;

const clampD = (d: number) => Math.min(10, Math.max(1, d));
const initDifficulty = (g: number) => clampD(W[4] - (g - 3) * W[5]);

/** Probability of recalling a card with stability s after t days. */
export function retrievability(t: number, s: number): number {
  return s > 0 ? Math.pow(1 + (FACTOR * t) / s, DECAY) : 0;
}

export const NEW_CARD: CardState = { state: 0, stability: 0, difficulty: 0, reps: 0, lapses: 0, last_review_at: null };

export function schedule(card: CardState, rating: Rating, now: Date = new Date()): Scheduled {
  const g = rating; // Again=1, Hard=2, Good=3 on the FSRS scale
  let { stability: s, difficulty: d, lapses } = card;

  if (card.state === 0 || s <= 0) {
    s = W[g - 1];
    d = initDifficulty(g);
  } else {
    const t = card.last_review_at ? Math.max(0, (now.getTime() - new Date(card.last_review_at).getTime()) / DAY) : 0;
    const r = retrievability(t, s);
    d = clampD(W[7] * initDifficulty(4) + (1 - W[7]) * (d - W[6] * (g - 3)));
    if (g === 1) {
      lapses += 1;
      s = Math.min(s, W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r)));
    } else {
      const hard = g === 2 ? W[15] : 1;
      s = s * (1 + Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * hard);
    }
  }

  const days = Math.min(MAX_DAYS, Math.max(1, Math.round(s)));
  const due = g === 1 ? new Date(now.getTime() + RELEARN_MS) : new Date(now.getTime() + days * DAY);
  return {
    state: g === 1 ? (card.state === 0 ? 1 : 3) : 2,
    stability: s,
    difficulty: d,
    reps: card.reps + 1,
    lapses,
    last_review_at: now.toISOString(),
    due_at: due.toISOString(),
  };
}
