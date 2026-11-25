import "server-only";
import { createClient } from "@/lib/supabase/server";
import { theoryBlocksSchema } from "./blocks";
import type { TheoryInput } from "@/app/(app)/admin/actions";

export type TheoryEditorData = {
  topic: { id: string; slug: string; title: string };
  objectives: { id: string; code: string; description: string }[];
  initial: TheoryInput;
};

/** A topic's theory pack in the shape the editor works with (staff pages only). */
export async function getTheoryEditorData(by: { id: string } | { slug: string }): Promise<TheoryEditorData | null> {
  const supabase = await createClient();
  const q = supabase.from("topics").select("id, slug, title, topic_objectives(learning_objectives(id, code, description))");
  const { data: topic } = await ("id" in by ? q.eq("id", by.id) : q.eq("slug", by.slug)).maybeSingle();
  if (!topic) return null;
  const t = topic as unknown as { id: string; slug: string; title: string; topic_objectives: { learning_objectives: { id: string; code: string; description: string } }[] };
  const { data: pack } = await supabase
    .from("theory_packs")
    .select("title, summary, status, theory_sections(id, title, blocks, sort_order, theory_section_objectives(learning_objective_id))")
    .eq("topic_id", t.id)
    .maybeSingle();
  const p = pack as unknown as {
    title: string; summary: string | null; status: TheoryInput["status"];
    theory_sections: { id: string; title: string; blocks: unknown; sort_order: number; theory_section_objectives: { learning_objective_id: string }[] }[];
  } | null;
  return {
    topic: { id: t.id, slug: t.slug, title: t.title },
    objectives: t.topic_objectives.map((o) => o.learning_objectives).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })),
    initial: {
      title: p?.title ?? t.title,
      summary: p?.summary ?? null,
      status: p?.status ?? "draft",
      sections: [...(p?.theory_sections ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((s) => {
          const parsed = theoryBlocksSchema.safeParse(s.blocks);
          return { id: s.id, title: s.title, objectiveIds: s.theory_section_objectives.map((o) => o.learning_objective_id), blocks: parsed.success ? parsed.data : [] };
        }),
    },
  };
}
