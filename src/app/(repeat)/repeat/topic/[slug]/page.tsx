import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTopicBySlug } from "@/lib/curriculum";
import { getT } from "@/lib/i18n/server";
import { getStudyProgress, getTheorySections, getTopicQuestions } from "@/lib/study/data";
import { NotReady, PageTitle, Panel, PillLink } from "@/components/repeat/ui";
import { cn } from "@/lib/cn";
import { Check, ChevronLeft, Lock } from "@/components/icons";
import { rp } from "@/lib/repeat-path";

export async function generateMetadata({ params }: PageProps<"/repeat/topic/[slug]">): Promise<Metadata> {
  const topic = await getTopicBySlug((await params).slug);
  return { title: topic?.title ?? "" };
}

export default async function RepeatTopic({ params }: PageProps<"/repeat/topic/[slug]">) {
  const [profile, t, { slug }] = await Promise.all([requireProfile(), getT(), params]);
  const topic = await getTopicBySlug(slug);
  if (!topic) notFound();
  const supabase = await createClient();
  const [progress, sections, questions] = await Promise.all([
    getStudyProgress(supabase, profile.id),
    getTheorySections(supabase, topic.id),
    getTopicQuestions(supabase, topic.id),
  ]);
  const s = progress.missing ? undefined : progress.byTopic.get(topic.id);
  const explained = (s?.explained ?? 0) > 0;
  const cards = s?.cards ?? 0;

  const steps = [
    {
      n: 1,
      title: t("Explain it"),
      method: t("Feynman method · understand"),
      text: t("Pick a part of the theory and explain it in your own words, aloud or in writing — with the material hidden. Then check what you missed and explain again, more simply."),
      done: explained,
      locked: false,
      action: sections.length ? <PillLink href={rp(`/topic/${slug}/explain`)} tone={explained ? "soft" : "primary"}>{explained ? t("Explain another part") : t("Start explaining")}</PillLink> : <p className="text-sm text-muted">{t("This topic has no published theory yet.")}</p>,
    },
    {
      n: 2,
      title: t("Recall"),
      method: t("Active recall · SAU/SAT preparation"),
      text: t("Practice questions of the topic: first answer from memory, then look at the answer and rate yourself honestly."),
      done: cards > 0,
      locked: !explained,
      action: questions.length ? (
        <PillLink href={rp(`/topic/${slug}/recall`)} tone={cards > 0 ? "soft" : "primary"}>
          {cards > 0 ? t("Recall more ({done} of {all})", { done: Math.min(cards, questions.length), all: questions.length }) : t("Start recall")}
        </PillLink>
      ) : (
        <p className="text-sm text-muted">{t("This topic has no practice questions yet.")}</p>
      ),
    },
    {
      n: 3,
      title: t("Review every day"),
      method: t("Spaced repetition · remember for long"),
      text: t("Recalled questions come back on the right day — just before you would forget them. A few minutes a day on the home page."),
      done: cards > 0 && !s?.due,
      locked: cards === 0,
      action: s?.due ? <PillLink href={rp("/review")} tone="accent">{t("Review today: {n}", { n: s.due })}</PillLink> : cards > 0 ? <p className="text-sm text-muted">{t("In review: {n} cards. Nothing due today.", { n: cards })}</p> : null,
    },
  ];

  return (
    <>
      <Link href={rp("/")} className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ChevronLeft className="h-4 w-4" /> {t("All topics")}
      </Link>
      <PageTitle eyebrow={topic.school[0] ? `${topic.school[0].unitCode} ${topic.school[0].unitTitle}` : undefined} title={topic.title} />
      {progress.missing && (
        <NotReady title={t("The repeat site is not set up in the database yet.")}>
          {t("You can read the steps, but results will not be saved until your teacher applies the database update.")}
        </NotReady>
      )}
      <ol className="space-y-4">
        {steps.map((st) => (
          <li key={st.n}>
            <Panel className={cn("flex gap-4", st.locked && "opacity-70")}>
              <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg font-bold", st.done ? "bg-primary text-primary-fg" : "bg-primary-soft text-primary")}>
                {st.done ? <Check className="h-5 w-5" /> : st.n}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <h2 className="text-lg font-semibold">{st.title}</h2>
                  <p className="text-xs font-medium uppercase tracking-wide text-primary">{st.method}</p>
                </div>
                <p className="text-sm text-muted">{st.text}</p>
                {st.locked ? (
                  <p className="inline-flex items-center gap-1.5 text-sm text-muted">
                    <Lock className="h-4 w-4" /> {st.n === 2 ? t("Opens after you explain at least one part of the theory.") : t("Opens after the first recall.")}
                  </p>
                ) : (
                  st.action
                )}
              </div>
            </Panel>
          </li>
        ))}
      </ol>
    </>
  );
}
