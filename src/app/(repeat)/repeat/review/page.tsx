import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { getQuestionsById, isMissingTable } from "@/lib/study/data";
import { CardSession } from "@/components/repeat/card-session";
import { NotReady, PageTitle, PillLink } from "@/components/repeat/ui";
import { rp } from "@/lib/repeat-path";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Daily review") };
}

const LIMIT = 30;

/** Fisher–Yates; topics are mixed on purpose (interleaving). */
function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default async function ReviewPage() {
  const [profile, t] = await Promise.all([requireProfile(), getT()]);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("study_cards")
    .select("question_id")
    .eq("student_id", profile.id)
    .lte("due_at", new Date().toISOString())
    .order("due_at")
    .limit(LIMIT * 2);
  const title = <PageTitle eyebrow={t("Step 3 · Spaced repetition")} title={t("Review today")}>{t("Cards whose day has come, from different topics. A few minutes a day keeps them in memory.")}</PageTitle>;
  if (isMissingTable(error)) {
    return (
      <>
        {title}
        <NotReady title={t("The repeat site is not set up in the database yet.")}>{t("Your teacher needs to apply the database update.")}</NotReady>
      </>
    );
  }
  // Questions that are no longer open for practice (made exam-only, archived) drop out here.
  const questions = shuffle(await getQuestionsById(supabase, ((data ?? []) as { question_id: string }[]).map((c) => c.question_id))).slice(0, LIMIT);
  if (questions.length === 0) {
    return (
      <>
        {title}
        <NotReady title={t("Nothing to review today")}>{t("Explain and recall a new topic, or come back tomorrow.")}</NotReady>
        <PillLink href={rp("/")}>{t("Home")}</PillLink>
      </>
    );
  }
  const topicIds = [...new Set(questions.flatMap((q) => (q.topic_id ? [q.topic_id] : [])))];
  const { data: topics } = await supabase.from("topics").select("id, title").in("id", topicIds);
  const topicTitles = Object.fromEntries(((topics ?? []) as { id: string; title: string }[]).map((x) => [x.id, x.title]));
  return (
    <>
      {title}
      <CardSession questions={questions} mode="review" topicTitles={topicTitles} doneHref="/" doneLabel={t("Home")} />
    </>
  );
}
