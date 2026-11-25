import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getTheoryEditorData } from "@/lib/theory/editor-data";
import { ButtonLink } from "@/components/ui/button";
import { TheoryEditor } from "@/components/admin/theory-editor";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Theory editor") };
}

/** Theory editor inside the topic (teachers and admins). Saves to theory_packs / theory_sections. */
export default async function TopicTheoryEditPage({ params }: { params: Promise<{ topic: string }> }) {
  const t = await getT();
  await requireProfile(["teacher", "admin"]);
  const { topic: slug } = await params;
  const d = await getTheoryEditorData({ slug });
  if (!d) notFound();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{t("Редактирование теории")}</h2>
        <ButtonLink href={`/learn/${slug}/theory`} variant="secondary" size="sm">{t("← К теории")}</ButtonLink>
      </div>
      <TheoryEditor topicId={d.topic.id} objectives={d.objectives} initial={d.initial} />
    </div>
  );
}
