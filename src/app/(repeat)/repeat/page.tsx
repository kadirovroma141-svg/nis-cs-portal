import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { getRepeatGrades, getStudyProgress } from "@/lib/study/data";
import { NotReady, PageTitle, Panel, PillLink } from "@/components/repeat/ui";
import { cn } from "@/lib/cn";
import { Check, ChevronRight } from "@/components/icons";
import { rp } from "@/lib/repeat-path";

export default async function RepeatHome({ searchParams }: PageProps<"/repeat">) {
  const [profile, t, sp] = await Promise.all([requireProfile(), getT(), searchParams]);
  const supabase = await createClient();
  const [grades, progress] = await Promise.all([getRepeatGrades(profile), getStudyProgress(supabase, profile.id)]);
  const wanted = Number(sp.grade);
  const grade = grades.find((g) => g.grade === wanted) ?? grades.find((g) => g.grade === profile.grade) ?? grades[0];

  return (
    <>
      <PageTitle eyebrow={t("Repeat")} title={t("Hi, {name}!", { name: profile.first_name || profile.username })}>
        {t("Each topic goes in three steps: explain it in your own words, recall the answers without hints, then review a little every day.")}
      </PageTitle>

      {progress.missing ? (
        <NotReady title={t("The repeat site is not set up in the database yet.")}>
          {t("Your teacher needs to apply the database update. Theory and questions are safe; your progress will start once it is done.")}
        </NotReady>
      ) : (
        <Panel className={cn("flex flex-wrap items-center gap-4", progress.due > 0 && "border-accent bg-accent-soft")}>
          <div className="grid h-16 w-16 place-items-center rounded-full bg-surface text-2xl font-bold text-accent shadow-[0_0_0_4px_var(--accent-soft)]">{progress.due}</div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold">{t("Review today: {n}", { n: progress.due })}</p>
            <p className="text-sm text-muted">
              {progress.due > 0 ? t("Cards from different topics, mixed. About {m} min.", { m: Math.max(1, Math.round(progress.due * 0.5)) }) : t("Nothing due. Start a new topic below or come back tomorrow.")}
            </p>
          </div>
          {progress.due > 0 && <PillLink href={rp("/review")} tone="accent">{t("Start review")}</PillLink>}
        </Panel>
      )}

      {grades.length > 1 && (
        <div className="flex flex-wrap gap-2" aria-label={t("Grade")}>
          {grades.map((g) => (
            <Link key={g.grade} href={rp(`/?grade=${g.grade}`)} className={cn("rounded-full px-3 py-1 text-sm font-medium", g.grade === grade?.grade ? "bg-primary text-primary-fg" : "bg-surface-2 text-muted hover:text-fg")}>
              {t("Grade {n}", { n: g.grade })}
            </Link>
          ))}
        </div>
      )}

      {!grade ? (
        <NotReady title={t("No topics yet")}>{t("Topics will appear here once your teacher publishes them.")}</NotReady>
      ) : (
        <Panel className="p-0 sm:p-0">
          <h2 className="px-5 pt-5 text-lg font-semibold sm:px-6">{t("Topics")}</h2>
          <ul className="mt-2 divide-y divide-border">
            {grade.topics.map((topic) => {
              const s = progress.missing ? undefined : progress.byTopic.get(topic.id);
              const steps = [
                { label: t("Explain it"), done: (s?.explained ?? 0) > 0 },
                { label: t("Recall"), done: (s?.cards ?? 0) > 0 },
                { label: s?.due ? t("Due: {n}", { n: s.due }) : t("Daily review"), done: (s?.cards ?? 0) > 0 && !s?.due },
              ];
              return (
                <li key={topic.id}>
                  <Link href={rp(`/topic/${topic.slug}`)} className="flex items-center gap-3 px-5 py-3 hover:bg-primary-soft/50 sm:px-6">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{topic.title}</p>
                      <p className="truncate text-xs text-muted">{topic.unit}</p>
                    </div>
                    <ol className="hidden items-center gap-1 sm:flex">
                      {steps.map((st, i) => (
                        <li key={i} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs", st.done ? "bg-primary-soft text-primary" : "bg-surface-2 text-muted")}>
                          {st.done ? <Check className="h-3 w-3" /> : <span className="font-mono">{i + 1}</span>}
                          {st.label}
                        </li>
                      ))}
                    </ol>
                    <ChevronRight className="h-4 w-4 text-muted" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </>
  );
}
