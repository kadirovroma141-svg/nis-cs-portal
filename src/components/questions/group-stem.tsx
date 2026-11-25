"use client";
import { Markdown } from "@/components/markdown";
import type { PaperQuestion } from "@/lib/questions/types";
import { T } from "@/components/ui/t";
import { useT } from "@/lib/i18n/client";

/** Shared scenario / figure / code of a structured question, shown above each of its parts. */
export function GroupStem({ q, total }: { q: Pick<PaperQuestion, "group_stem" | "group_number" | "group_title">; total?: number }) {
  const t = useT();
  if (!q.group_stem) return null;
  return (
    <section className="mb-5 rounded-lg border border-border bg-surface-2 p-4" aria-label={t("Question {group_number}", { group_number: q.group_number })}>
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        <T s="Question" />{" "}{q.group_number}
        {total ? <span className="font-normal normal-case tracking-normal"><T s="· [Total:" />{" "}{total}]</span> : null}
      </p>
      <Markdown>{q.group_stem}</Markdown>
    </section>
  );
}
