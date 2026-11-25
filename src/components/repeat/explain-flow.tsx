"use client";
import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/client";
import { Markdown } from "@/components/markdown";
import { saveExplanation } from "@/app/(repeat)/repeat/actions";
import type { ChecklistItem } from "@/lib/study/checklist";
import { useSpeech } from "./use-speech";
import { Panel, pill } from "./ui";
import { cn } from "@/lib/cn";
import { BookOpen, Check, ExternalLink, Mic, Lightbulb } from "@/components/icons";
import { rp } from "@/lib/repeat-path";

type Phase = "explain" | "check" | "simpler" | "check2" | "done";

/** Text box with dictation. The text lives only in this page's memory. */
function Explainer({ value, onChange, lang, placeholder }: { value: string; onChange: (v: string) => void; lang: string; placeholder: string }) {
  const t = useT();
  const append = useCallback((s: string) => onChange(value ? `${value.trimEnd()} ${s}` : s), [value, onChange]);
  const speech = useSpeech(lang, append);
  return (
    <div className="space-y-2">
      <textarea
        value={speech.interim ? `${value}${value ? " " : ""}${speech.interim}` : value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={speech.listening}
        rows={8}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-2xl border border-border bg-background p-4 text-base leading-relaxed outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft"
      />
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        {speech.supported ? (
          <button type="button" onClick={speech.listening ? speech.stop : speech.start} className={pill(speech.listening ? "accent" : "plain")}>
            <Mic className="h-4 w-4" />
            {speech.listening ? t("Stop dictation") : t("Explain aloud")}
          </button>
        ) : (
          <span>{t("Voice input is not supported in this browser — type instead.")}</span>
        )}
        {speech.listening && <span className="animate-pulse text-accent">{t("Listening… you can fix the text afterwards.")}</span>}
        {speech.error && <span className="text-danger">{t("Microphone error: {e}", { e: speech.error })}</span>}
        <span className="ml-auto">{t("Nothing is saved: the text stays on this page.")}</span>
      </div>
    </div>
  );
}

export function ExplainFlow({ topicId, sectionId, sectionTitle, slug, items, lang }: {
  topicId: string;
  sectionId: string;
  sectionTitle: string;
  slug: string;
  items: ChecklistItem[];
  lang: string;
}) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>("explain");
  const [text, setText] = useState("");
  const [missed, setMissed] = useState<Set<number>>(new Set());
  const [firstMissed, setFirstMissed] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const sourceHref = rp(`/topic/${slug}/source?section=${sectionId}`);

  const toggle = (i: number) =>
    setMissed((m) => {
      const n = new Set(m);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  const save = (round: 1 | 2, then: Phase) =>
    start(async () => {
      const res = await saveExplanation({ topicId, sectionId, round, total: items.length, missed: [...missed] });
      setError(res.ok ? null : t(res.error));
      if (round === 1) setFirstMissed([...missed].sort((a, b) => a - b));
      setMissed(new Set());
      setText("");
      setPhase(then);
    });

  const sourceLink = (
    <a href={sourceHref} target="_blank" rel="noreferrer" className={pill("plain")}>
      <BookOpen className="h-4 w-4" /> {t("Back to the source")} <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );

  const checklist = (
    <ul className="space-y-2">
      {items.map((item, i) => {
        const on = missed.has(i);
        return (
          <li key={i}>
            <label className={cn("flex cursor-pointer gap-3 rounded-2xl border p-3 text-sm transition-colors", on ? "border-accent bg-accent-soft" : "border-border hover:bg-surface-2")}>
              <input type="checkbox" checked={on} onChange={() => toggle(i)} className="mt-1 h-4 w-4 accent-accent" />
              <Markdown className="min-w-0 flex-1">{item.text}</Markdown>
              {on && <span className="shrink-0 self-start rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-fg">{t("missed")}</span>}
            </label>
          </li>
        );
      })}
    </ul>
  );

  const steps: { key: Phase[]; label: string }[] = [
    { key: ["explain"], label: t("Explain it") },
    { key: ["check"], label: t("Check") },
    { key: ["simpler", "check2"], label: t("Simpler, with an analogy") },
  ];

  return (
    <div className="space-y-4">
      <ol className="flex flex-wrap gap-2 text-xs font-medium">
        {steps.map((s, i) => {
          const idx = steps.findIndex((x) => x.key.includes(phase));
          const state = phase === "done" || i < idx ? "done" : i === idx ? "now" : "next";
          return (
            <li key={i} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1", state === "now" ? "bg-primary text-primary-fg" : state === "done" ? "bg-primary-soft text-primary" : "bg-surface-2 text-muted")}>
              {state === "done" ? <Check className="h-3 w-3" /> : i + 1} {s.label}
            </li>
          );
        })}
      </ol>

      {error && <p className="rounded-2xl bg-danger-soft px-4 py-2 text-sm text-danger">{error}</p>}

      {phase === "explain" && (
        <Panel className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{t("Explain «{title}» in your own words", { title: sectionTitle })}</h2>
            <p className="text-sm text-muted">{t("The material is hidden. Imagine you are teaching a classmate who missed the lesson. Say what it is, why it matters and give an example.")}</p>
          </div>
          <Explainer value={text} onChange={setText} lang={lang} placeholder={t("Your explanation…")} />
          <button type="button" disabled={text.trim().length < 20} onClick={() => setPhase("check")} className={pill("primary")}>
            {t("Done — check myself")}
          </button>
        </Panel>
      )}

      {(phase === "check" || phase === "check2") && (
        <Panel className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{t("What did you miss?")}</h2>
            <p className="text-sm text-muted">{t("Key points of this part. Tick the ones that were NOT in your explanation — honestly, only you see this list.")}</p>
          </div>
          {text && (
            <details className="rounded-2xl bg-surface-2 p-3 text-sm">
              <summary className="cursor-pointer font-medium">{t("Your explanation")}</summary>
              <p className="mt-2 whitespace-pre-wrap text-muted">{text}</p>
            </details>
          )}
          {items.length ? checklist : <p className="text-sm text-muted">{t("No checklist for this part — compare with the source instead.")}</p>}
          <div className="flex flex-wrap gap-2">
            {sourceLink}
            <button type="button" disabled={pending} onClick={() => save(phase === "check" ? 1 : 2, phase === "check" ? "simpler" : "done")} className={pill("primary")}>
              {phase === "check" ? t("Save and explain more simply") : t("Save")}
            </button>
          </div>
        </Panel>
      )}

      {phase === "simpler" && (
        <Panel className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{t("Now explain it again — simpler")}</h2>
            <p className="text-sm text-muted">{t("As if to a younger student: short sentences, no difficult words, and an analogy from everyday life.")}</p>
          </div>
          {firstMissed.length > 0 && (
            <div className="rounded-2xl border border-accent bg-accent-soft p-3 text-sm">
              <p className="mb-1 inline-flex items-center gap-1.5 font-semibold text-accent">
                <Lightbulb className="h-4 w-4" /> {t("Include what you missed:")}
              </p>
              <ul className="list-disc space-y-1 pl-5">
                {firstMissed.map((i) => (
                  <li key={i}>
                    <Markdown inline>{items[i]?.text ?? ""}</Markdown>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Explainer value={text} onChange={setText} lang={lang} placeholder={t("A simpler explanation with an analogy…")} />
          <div className="flex flex-wrap gap-2">
            {sourceLink}
            <button type="button" disabled={text.trim().length < 20} onClick={() => setPhase("check2")} className={pill("primary")}>
              {t("Done — check again")}
            </button>
          </div>
        </Panel>
      )}

      {phase === "done" && (
        <Panel className="space-y-3 text-center">
          <p className="text-lg font-semibold">{t("Well done! You explained «{title}» twice.", { title: sectionTitle })}</p>
          <p className="text-sm text-muted">{t("Next: recall the answers to the topic's questions without hints.")}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href={rp(`/topic/${slug}/recall`)} className={pill("primary")}>{t("Go to recall")}</Link>
            <Link href={rp(`/topic/${slug}/explain`)} className={pill("plain")}>{t("Explain another part")}</Link>
          </div>
        </Panel>
      )}
    </div>
  );
}
