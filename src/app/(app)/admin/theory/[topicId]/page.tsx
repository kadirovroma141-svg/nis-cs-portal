import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getTheoryEditorData } from "@/lib/theory/editor-data";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { TheoryEditor } from "@/components/admin/theory-editor";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Theory editor") };
}

export default async function TheoryEditorPage({ params }: PageProps<"/admin/theory/[topicId]">) {
  const tr = await getT();
  await requireProfile(["admin"]);
  const { topicId } = await params;
  const d = await getTheoryEditorData({ id: topicId });
  if (!d) notFound();
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Curriculum", href: "/admin/curriculum" }, { label: d.topic.title, href: `/admin/topics/${d.topic.id}` }, { label: "Theory pack" }]}
        title={tr("Theory pack — {title}", { title: d.topic.title })}
        description={tr("Content is stored as structured blocks (JSON), separate from the application code.")}
        actions={<ButtonLink href={`/learn/${d.topic.slug}/theory`} variant="secondary">{tr("View as student")}</ButtonLink>}
      />
      <TheoryEditor topicId={d.topic.id} objectives={d.objectives} initial={d.initial} />
    </>
  );
}
