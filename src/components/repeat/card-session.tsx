"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/client";
import { Markdown } from "@/components/markdown";
import { rateCard, revealAnswer, type Reveal } from "@/app/(repeat)/repeat/actions";
import type { StudyQuestion } from "@/lib/study/data";
import type { Rating } from "@/lib/study/fsrs";
import { Panel, pill } from "./ui";
import { cn } from "@/lib/cn";
import { Check, Eye } from "@/components/icons";
import { rp } from "@/lib/repeat-path";

// One card at a time: answer from memory first (typed, or "I recalled it in
// my head"), then the options and the answer are shown, then a self-rating
// that schedules the card. Used for the first recall of a topic and for the
// daily review.

const RATINGS: { value: Rating; label: string; hint: string; tone: string }[] = [
  { value: 1, label: "Didn't recall", hint: "again in 10 min", tone: "border-danger text-danger hover:bg-danger-soft" },
  { value: 2, label: "With effort", hint: "a bit later", tone: "border-accent text-accent hover:bg-accent-soft" },
  { value: 3, label: "Easily", hint: "much later", tone: "border-primary text-primary hover:bg-primary-soft" },
];

function questionText(q: StudyQuestion) {
  // fill_blank marks gaps as [[1]], [[2]] …
  return q.question_type === "fill_blank" ? q.question_text.replace(/\[\[(\d+)\]\]/g, "____ ($1)") : q.question_text;
}

function AnswerView({ q, reveal }: { q: StudyQuestion; reveal: Reveal | null }) {
  const t = useT();
  if (!reveal) return <p className="text-sm text-muted">{t("Loading…")}</p>;
  if (!reveal.ok) return <p className="text-sm text-danger">{t(reveal.error)}</p>;
  const keys = new Set(reveal.keys ?? []);
  const hasAny = q.options.length || reveal.truth !== undefined || reveal.pairs || reveal.values || reveal.points;
  return (
    <div className="space-y-3">
      {q.options.length > 0 && (
        <ul className="space-y-1.5">
          {q.options.map((o) => (
            <li key={o.key} className={cn("flex gap-2 rounded-xl border px-3 py-2 text-sm", keys.has(o.key) ? "border-primary bg-primary-soft" : "border-border")}>
              <span className="font-mono font-semibold">{o.key}</span>
              <Markdown inline className="min-w-0 flex-1">{o.content}</Markdown>
              {keys.has(o.key) && <Check className="h-4 w-4 shrink-0 text-primary" />}
            </li>
          ))}
        </ul>
      )}
      {reveal.truth !== undefined && <p className="font-semibold">{reveal.truth ? t("True") : t("False")}</p>}
      {reveal.pairs && (
        <ul className="space-y-1 text-sm">
          {reveal.pairs.map(([l, r], i) => (
            <li key={i}>
              <Markdown inline>{l}</Markdown> → <strong><Markdown inline>{r}</Markdown></strong>
            </li>
          ))}
        </ul>
      )}
      {reveal.values && (
        <p className="text-sm">
          <span className="text-muted">{t("Answer:")} </span>
          <strong>{reveal.values.join("; ")}</strong>
        </p>
      )}
      {reveal.points && (
        <div className="text-sm">
          <p className="text-muted">{t("A full answer contains:")}</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {reveal.points.map((p, i) => (
              <li key={i}>
                <Markdown inline>{p}</Markdown>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!hasAny && <p className="text-sm text-muted">{t("No stored answer for this question — compare with the theory of the topic.")}</p>}
    </div>
  );
}

export function CardSession({ questions, mode, topicTitles, doneHref, doneLabel }: {
  questions: StudyQuestion[];
  mode: "recall" | "review";
  topicTitles?: Record<string, string>;
  doneHref: string;
  doneLabel: string;
}) {
  const t = useT();
  const [queue, setQueue] = useState(questions);
  const [answer, setAnswer] = useState("");
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState(0);
  const [missedAgain, setMissedAgain] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const q = queue[0];

  if (!q) {
    return (
      <Panel className="space-y-3 text-center">
        <p className="text-lg font-semibold">{t("Done: {n} cards", { n: done })}</p>
        <p className="text-sm text-muted">
          {missedAgain > 0 ? t("Cards you did not recall will come back in about 10 minutes.") : t("The cards will come back on the right day for review.")}
        </p>
        <Link href={rp(doneHref)} className={pill("primary")}>{doneLabel}</Link>
      </Panel>
    );
  }

  const show = () => {
    setShown(true);
    setReveal(null);
    revealAnswer(q.id).then(setReveal, () => setReveal({ ok: false, error: "Could not load the answer." }));
  };

  const rate = (r: Rating) =>
    start(async () => {
      const res = await rateCard(q.id, r, mode);
      if (!res.ok) {
        setError(t(res.error));
        return;
      }
      setError(null);
      setDone((d) => d + 1);
      if (r === 1) setMissedAgain((m) => m + 1);
      setQueue((qs) => qs.slice(1));
      setAnswer("");
      setShown(false);
      setReveal(null);
    });

  const topic = q.topic_id ? topicTitles?.[q.topic_id] : undefined;
  const total = done + queue.length;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-sm text-muted">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(done / Math.max(1, total)) * 100}%` }} />
        </div>
        <span className="font-mono">{done + 1} / {total}</span>
      </div>

      <Panel className="space-y-4">
        {topic && <p className="text-xs font-semibold uppercase tracking-wide text-primary">{topic}</p>}
        {q.group_stem && <Markdown className="rounded-xl bg-surface-2 p-3 text-sm">{q.group_stem}</Markdown>}
        <Markdown className="text-base">{questionText(q)}</Markdown>
        {q.content.starter_code && (
          <pre className="overflow-x-auto rounded-xl bg-surface-2 p-3 font-mono text-sm">{q.content.starter_code}</pre>
        )}
        {q.content.left && !shown && (
          <p className="text-sm text-muted">{t("Match: {items}", { items: q.content.left.map((l) => l.text).join(" · ") })}</p>
        )}

        {!shown ? (
          <div className="space-y-3">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={3}
              placeholder={t("Your answer from memory (optional)…")}
              aria-label={t("Your answer from memory (optional)…")}
              className="w-full rounded-2xl border border-border bg-background p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft"
            />
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={show} className={pill("primary")}>
                <Eye className="h-4 w-4" /> {answer.trim() ? t("Show the answer") : t("I recalled it in my head — show")}
              </button>
              {q.options.length > 0 && <span className="self-center text-xs text-muted">{t("Options are hidden until you try to recall.")}</span>}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {answer.trim() && (
              <p className="rounded-xl bg-surface-2 p-3 text-sm">
                <span className="text-muted">{t("You wrote:")} </span>
                <span className="whitespace-pre-wrap">{answer}</span>
              </p>
            )}
            <AnswerView q={q} reveal={reveal} />
            <div>
              <p className="mb-2 text-sm font-semibold">{t("How well did you recall it?")}</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {RATINGS.map((r) => (
                  <button key={r.value} type="button" disabled={pending} onClick={() => rate(r.value)} className={cn("rounded-2xl border-2 bg-surface px-4 py-2.5 text-left transition-colors disabled:opacity-50", r.tone)}>
                    <span className="block font-semibold">{t(r.label)}</span>
                    <span className="block text-xs opacity-80">{t(r.hint)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {error && <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      </Panel>
    </div>
  );
}
