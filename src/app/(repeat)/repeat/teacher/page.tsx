import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { relativeTime } from "@/lib/format";
import { isMissingTable } from "@/lib/study/data";
import { Markdown } from "@/components/markdown";
import { NotReady, PageTitle, Panel } from "@/components/repeat/ui";
import { cn } from "@/lib/cn";
import { rp } from "@/lib/repeat-path";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Class summary") };
}

type Activity = { student_id: string; first_name: string; last_name: string; username: string; actions: number; last_at: string | null };
type Missed = { question_id: string; title: string; question_text: string; topic_title: string | null; misses: number; students: number };

/** Short class summary for the teacher: who studied this week, the five questions the class recalls worst. */
export default async function TeacherSummary({ searchParams }: PageProps<"/repeat/teacher">) {
  const [profile, t, sp] = await Promise.all([requireProfile(["teacher", "admin"]), getT(), searchParams]);
  const supabase = await createClient();
  let q = supabase.from("classes").select("id, name, grade").is("archived_at", null).order("grade").order("name");
  if (profile.role !== "admin") q = q.eq("teacher_id", profile.id);
  const { data: classes } = await q;
  const list = (classes ?? []) as { id: string; name: string; grade: number }[];
  const cls = list.find((c) => c.id === sp.class) ?? list[0];

  const header = <PageTitle eyebrow={t("Repeat")} title={t("Class summary")}>{t("Only aggregates: who studied in the last 7 days and which questions the class most often did not recall (30 days). Explanations themselves are not stored.")}</PageTitle>;
  if (!cls) {
    return (
      <>
        {header}
        <NotReady title={t("No classes")}>{t("You have no active classes.")}</NotReady>
      </>
    );
  }

  const [act, missed] = await Promise.all([
    supabase.rpc("study_class_activity", { p_class: cls.id, p_days: 7 }),
    supabase.rpc("study_class_missed", { p_class: cls.id, p_days: 30, p_limit: 5 }),
  ]);
  const students = (act.data ?? []) as Activity[];
  const active = students.filter((s) => Number(s.actions) > 0);
  const hard = (missed.data ?? []) as Missed[];

  return (
    <>
      {header}
      {list.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {list.map((c) => (
            <Link key={c.id} href={rp(`/teacher?class=${c.id}`)} className={cn("rounded-full px-3 py-1 text-sm font-medium", c.id === cls.id ? "bg-primary text-primary-fg" : "bg-surface-2 text-muted hover:text-fg")}>
              {c.name}
            </Link>
          ))}
        </div>
      )}
      {isMissingTable(act.error) || isMissingTable(missed.error) ? (
        <NotReady title={t("The repeat site is not set up in the database yet.")}>{t("Apply the migration 20261030000020_study_repeat.sql to the database to see the summary.")}</NotReady>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel className="space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">{t("Studied this week")}</h2>
              <span className="text-2xl font-bold text-primary">{active.length}<span className="text-base font-medium text-muted"> / {students.length}</span></span>
            </div>
            <ul className="divide-y divide-border text-sm">
              {students.map((s) => (
                <li key={s.student_id} className="flex items-center gap-3 py-2">
                  <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", Number(s.actions) > 0 ? "bg-primary" : "bg-border-strong")} />
                  <span className="flex-1">{`${s.last_name} ${s.first_name}`.trim() || s.username}</span>
                  <span className="text-muted">{Number(s.actions) > 0 && s.last_at ? relativeTime(s.last_at, t) : t("not yet")}</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel className="space-y-3">
            <h2 className="text-lg font-semibold">{t("Top 5 «didn't recall»")}</h2>
            {hard.length === 0 ? (
              <p className="text-sm text-muted">{t("No misses in the last 30 days.")}</p>
            ) : (
              <ol className="space-y-3">
                {hard.map((h, i) => (
                  <li key={h.question_id} className="flex gap-3 text-sm">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-soft font-semibold text-accent">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      {h.topic_title && <p className="text-xs text-muted">{h.topic_title}</p>}
                      <Markdown className="line-clamp-3">{h.question_text}</Markdown>
                      <p className="text-xs text-muted">{t("{n} times · {s} students", { n: Number(h.misses), s: Number(h.students) })}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}
