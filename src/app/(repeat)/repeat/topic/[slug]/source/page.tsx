import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTopicBySlug } from "@/lib/curriculum";
import { getTopicSlidesUrl } from "@/lib/slides";
import { getTopicPresentations } from "@/lib/presentations";
import { GoogleSlidesEmbed } from "@/components/slides/google-slides-embed";
import { getT } from "@/lib/i18n/server";
import { getTheorySections } from "@/lib/study/data";
import { TheoryBlockView } from "@/components/theory/theory-block";
import { NotReady, PageTitle, Panel } from "@/components/repeat/ui";
import { ChevronLeft, Presentation } from "@/components/icons";
import { rp } from "@/lib/repeat-path";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Source") };
}

/** "Back to the source": one published theory section (and the topic's slides), read-only. */
export default async function SourcePage({ params, searchParams }: PageProps<"/repeat/topic/[slug]/source">) {
  const [, t, { slug }, sp] = await Promise.all([requireProfile(), getT(), params, searchParams]);
  const topic = await getTopicBySlug(slug);
  if (!topic) notFound();
  const [sections, slides] = await Promise.all([getTheorySections(await createClient(), topic.id), getTopicSlidesUrl(slug)]);
  const presentations = getTopicPresentations(slug);
  const section = sections.find((s) => s.id === sp.section) ?? null;
  const shown = section ? [section] : sections;
  return (
    <>
      <Link href={rp(`/topic/${slug}`)} className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ChevronLeft className="h-4 w-4" /> {topic.title}
      </Link>
      <PageTitle eyebrow={t("Source")} title={section?.title ?? topic.title} />
      {shown.length === 0 && <NotReady title={t("No theory yet")}>{t("This topic has no published theory yet.")}</NotReady>}
      {shown.map((s) => (
        <Panel key={s.id} className="space-y-4">
          {!section && <h2 className="text-lg font-semibold">{s.title}</h2>}
          {s.blocks.map((b, i) => (
            <TheoryBlockView key={i} block={b} />
          ))}
        </Panel>
      ))}
      {(presentations.length > 0 || slides) && (
        <Panel className="space-y-3">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
            <Presentation className="h-5 w-5 text-primary" /> {t("Lesson slides")}
          </h2>
          <GoogleSlidesEmbed
            topicSlug={slug}
            topicTitle={topic.title}
            initialSlidesUrl={slides}
            presentations={presentations}
          />
        </Panel>
      )}
    </>
  );
}
