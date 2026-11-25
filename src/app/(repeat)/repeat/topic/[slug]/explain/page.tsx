import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTopicBySlug } from "@/lib/curriculum";
import { getT } from "@/lib/i18n/server";
import { getGuidedNotes, getTheorySections } from "@/lib/study/data";
import { buildChecklist } from "@/lib/study/checklist";
import { ExplainFlow } from "@/components/repeat/explain-flow";
import { NotReady, PageTitle, Panel } from "@/components/repeat/ui";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import { rp } from "@/lib/repeat-path";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Explain it") };
}

export default async function ExplainPage({ params, searchParams }: PageProps<"/repeat/topic/[slug]/explain">) {
  const [, t, { slug }, sp] = await Promise.all([requireProfile(), getT(), params, searchParams]);
  const topic = await getTopicBySlug(slug);
  if (!topic) notFound();
  const sections = await getTheorySections(await createClient(), topic.id);
  const section = sections.find((s) => s.id === sp.section);
  const back = (
    <Link href={rp(section ? `/topic/${slug}/explain` : `/topic/${slug}`)} className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
      <ChevronLeft className="h-4 w-4" /> {section ? t("Choose another part") : topic.title}
    </Link>
  );

  if (!section) {
    return (
      <>
        {back}
        <PageTitle eyebrow={t("Step 1 · Explain")} title={t("Which part will you explain?")}>
          {t("Take one part at a time. You will not see the text while explaining — only afterwards, to check yourself.")}
        </PageTitle>
        {sections.length === 0 ? (
          <NotReady title={t("No theory yet")}>{t("This topic has no published theory yet.")}</NotReady>
        ) : (
          <Panel className="p-0 sm:p-0">
            <ul className="divide-y divide-border">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <Link href={rp(`/topic/${slug}/explain?section=${s.id}`)} className="flex items-center gap-3 px-5 py-3.5 hover:bg-primary-soft/50 sm:px-6">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary">{i + 1}</span>
                    <span className="flex-1 font-medium">{s.title}</span>
                    <ChevronRight className="h-4 w-4 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </>
    );
  }

  const notes = await getGuidedNotes(slug);
  const items = buildChecklist(section.blocks, notes, sections.length === 1);
  const grade = topic.school[0]?.grade ?? 10;
  return (
    <>
      {back}
      <PageTitle eyebrow={`${t("Step 1 · Explain")} · ${topic.title}`} title={section.title} />
      <ExplainFlow topicId={topic.id} sectionId={section.id} sectionTitle={section.title} slug={slug} items={items} lang={grade >= 11 ? "en-US" : "ru-RU"} />
    </>
  );
}
