import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTopicBySlug } from "@/lib/curriculum";
import { theoryBlocksSchema, type TheoryBlock } from "@/lib/theory/blocks";
import { TheoryBlockView } from "@/components/theory/theory-block";
import { SectionViewTracker } from "@/components/theory/view-tracker";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, PencilLine } from "@/components/icons";
import { LoCode } from "@/components/lo-code";
import { TheoryFullscreen } from "@/components/theory/theory-fullscreen";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Theory Pack") };
}

export default async function TheoryPage({
  params,
}: PageProps<"/learn/[topic]/theory">) {
  const t = await getT();
  const [profile, topic] = await Promise.all([requireProfile(), params.then((p) => getTopicBySlug(p.topic))]);
  if (!topic) notFound();
  const supabase = await createClient();
  const isStudent = profile.role === "student";
  const canEdit = profile.role === "teacher" || profile.role === "admin";
  const editLink = canEdit ? (
    <ButtonLink href={`/learn/${topic.slug}/theory/edit`} variant="secondary" size="sm">
      <PencilLine className="h-4 w-4" /> {t("Редактировать теорию")}
    </ButtonLink>
  ) : null;
  // The pack and the student's reading progress are independent queries.
  const [{ data: pack }, { data: viewed }] = await Promise.all([
    supabase
      .from("theory_packs")
      .select(
        "id, title, summary, status, theory_sections(id, title, blocks, sort_order, theory_section_objectives(learning_objectives(code, curriculum_version_id)))",
      )
      .eq("topic_id", topic.id)
      .maybeSingle(),
    isStudent
      ? supabase.from("theory_progress").select("theory_section_id").eq("student_id", profile.id)
      : { data: [] },
  ]);
  type Pack = {
    id: string;
    summary: string | null;
    status: string;
    theory_sections: {
      id: string;
      title: string;
      blocks: unknown;
      sort_order: number;
      theory_section_objectives: {
        learning_objectives: { code: string; curriculum_version_id: string };
      }[];
    }[];
  };
  const p = pack as Pack | null;

  if (!p || p.theory_sections.length === 0) {
    return (
      <EmptyState
        title={t("The theory pack for this topic is being written")}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            {editLink}
            <ButtonLink href={`/learn/${topic.slug}/practice`}>
              {t("Go to practice")}
            </ButtonLink>
          </div>
        }
      >
        {t("The learning objectives are listed on the Overview tab.")}
      </EmptyState>
    );
  }

  const viewedIds = new Set(
    ((viewed ?? []) as { theory_section_id: string }[]).map((v) => v.theory_section_id),
  );
  const sections = [...p.theory_sections].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  return (
    <TheoryFullscreen title={t("{title} — Theory", { title: topic.title })}>
      <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
        <nav aria-label={t("Theory sections")} className="hidden lg:block">
          <ol className="sticky top-24 space-y-1 text-sm group-data-[fs=true]:top-16">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#s-${s.id}`}
                  className="flex items-start gap-2 rounded-md px-2 py-1.5 text-muted hover:bg-surface-2 hover:text-fg"
                >
                  <span className="tabular-nums">{i + 1}.</span>
                  <span className="flex-1">{s.title}</span>
                  {viewedIds.has(s.id) && (
                    <CheckCircle2
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success"
                      aria-label={t("Read")}
                    />
                  )}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="min-w-0 space-y-6">
          {editLink && <div className="flex justify-end print:hidden">{editLink}</div>}
          {p.status !== "published" && (
            <Badge tone="warning">
              {t("Preview — this theory pack is not published")}
            </Badge>
          )}
          {sections.map((s, i) => {
            const parsed = theoryBlocksSchema.safeParse(s.blocks);
            const blocks: TheoryBlock[] = parsed.success ? parsed.data : [];
            const codes = s.theory_section_objectives.map((o) => ({
              code: o.learning_objectives.code,
              paper:
                o.learning_objectives.curriculum_version_id !==
                topic.curriculumVersionId,
            }));
            return (
              <Card
                key={s.id}
                id={`s-${s.id}`}
                className="scroll-mt-24 group-data-[fs=true]:scroll-mt-16"
              >
                <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-4 sm:px-7">
                  <h2 className="mr-auto text-lg font-semibold">
                    <span className="mr-2 text-muted tabular-nums">
                      {i + 1}.
                    </span>
                    {s.title}
                  </h2>
                  {codes.map((c) => (
                    <Badge key={c.code + c.paper} tone="primary">
                      {t("LO")}{" "}<LoCode code={c.code} paper={c.paper} />
                    </Badge>
                  ))}
                </div>
                <div className="space-y-4 px-5 py-5 sm:px-7">
                  {blocks.map((b, j) => (
                    <TheoryBlockView key={j} block={b} />
                  ))}
                  {!parsed.success && (
                    <p className="text-sm text-danger">
                      {t("This section contains invalid content.")}
                    </p>
                  )}
                </div>
                <SectionViewTracker
                  sectionId={s.id}
                  enabled={isStudent && !viewedIds.has(s.id)}
                />
              </Card>
            );
          })}
          <div className="flex justify-end">
            <ButtonLink href={`/learn/${topic.slug}/practice`}>
              {t("Practise this topic")}
            </ButtonLink>
          </div>
        </div>
      </div>
    </TheoryFullscreen>
  );
}
