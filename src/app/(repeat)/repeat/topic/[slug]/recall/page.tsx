import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTopicBySlug } from "@/lib/curriculum";
import { getT } from "@/lib/i18n/server";
import { getStudyProgress, getTopicQuestions } from "@/lib/study/data";
import { CardSession } from "@/components/repeat/card-session";
import { NotReady, PageTitle, PillLink } from "@/components/repeat/ui";
import { ChevronLeft } from "@/components/icons";
import { rp } from "@/lib/repeat-path";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Recall") };
}

const BATCH = 10;

export default async function RecallPage({ params }: PageProps<"/repeat/topic/[slug]/recall">) {
  const [profile, t, { slug }] = await Promise.all([requireProfile(), getT(), params]);
  const topic = await getTopicBySlug(slug);
  if (!topic) notFound();
  const supabase = await createClient();
  const [progress, questions, { data: carded }] = await Promise.all([
    getStudyProgress(supabase, profile.id),
    getTopicQuestions(supabase, topic.id),
    supabase.from("study_cards").select("question_id").eq("student_id", profile.id).eq("topic_id", topic.id),
  ]);
  const back = (
    <Link href={rp(`/topic/${slug}`)} className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
      <ChevronLeft className="h-4 w-4" /> {topic.title}
    </Link>
  );
  const title = <PageTitle eyebrow={`${t("Step 2 · Recall")} · ${topic.title}`} title={t("Recall without hints")}>{t("Try to answer before you look. Rate yourself honestly — that decides when the question comes back.")}</PageTitle>;

  if (progress.missing) {
    return (
      <>
        {back}
        {title}
        <NotReady title={t("The repeat site is not set up in the database yet.")}>{t("Your teacher needs to apply the database update.")}</NotReady>
      </>
    );
  }
  // The teacher's order: explain first, then recall.
  if (!progress.byTopic.get(topic.id)?.explained) {
    return (
      <>
        {back}
        {title}
        <NotReady title={t("First explain the topic")}>
          {t("Recall opens after you explain at least one part of the theory in your own words.")}
        </NotReady>
        <PillLink href={rp(`/topic/${slug}/explain`)}>{t("Start explaining")}</PillLink>
      </>
    );
  }
  const seen = new Set(((carded ?? []) as { question_id: string }[]).map((c) => c.question_id));
  const fresh = questions.filter((q) => !seen.has(q.id));
  if (fresh.length === 0) {
    return (
      <>
        {back}
        {title}
        <NotReady title={questions.length ? t("All questions of the topic are in review") : t("This topic has no practice questions yet.")}>
          {questions.length ? t("They will come back on the right day. Check «Review today» on the home page.") : t("Questions will appear here once they are published.")}
        </NotReady>
        <PillLink href={rp("/")}>{t("Home")}</PillLink>
      </>
    );
  }
  return (
    <>
      {back}
      {title}
      <p className="text-sm text-muted">{t("New questions: {n} of {all}. In one go: {b}.", { n: fresh.length, all: questions.length, b: Math.min(BATCH, fresh.length) })}</p>
      <CardSession questions={fresh.slice(0, BATCH)} mode="recall" doneHref={fresh.length > BATCH ? `/topic/${slug}/recall` : `/topic/${slug}`} doneLabel={fresh.length > BATCH ? t("Next questions") : t("Back to the topic")} />
    </>
  );
}
