import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSchoolTree } from "@/lib/curriculum";
import { theoryBlocksSchema, type TheoryBlock } from "@/lib/theory/blocks";
import type { GuidedNotes } from "@/lib/study/checklist";
import type { Profile } from "@/lib/db-types";
import type { QuestionContent, QuestionOption } from "@/lib/questions/types";

// Read side of the repeat site. Content is read only, and only what is
// published: theory packs with status=published, practice questions with
// status=published and practice_enabled (exam-only questions never appear).
// The study_* tables may not exist yet in a database the migration has not
// reached — callers get { missing: true } and show a notice instead of failing.

type Supa = Awaited<ReturnType<typeof createClient>>;

/** Undefined table/function, as reported by Postgres (42P01, 42883) or PostgREST (PGRST205, PGRST202). */
export function isMissingTable(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return ["42P01", "42883", "PGRST205", "PGRST202"].includes(error.code ?? "") || /does not exist|schema cache/i.test(error.message ?? "");
}

/** Question types that can be recalled from memory and then compared with a shown answer. */
export const RECALL_TYPES = [
  "mcq", "multiple_response", "true_false", "matching", "fill_blank", "short_answer", "calculation",
  "code_analysis", "boolean_expression", "extended", "scenario", "pseudocode", "labelled_answers",
] as const;

export type RepeatTopic = { id: string; slug: string; title: string; unit: string };

/** Topics the viewer can see, by grade: a student gets their own grade, staff get all. */
export const getRepeatGrades = cache(async (profile: Profile) => {
  const tree = await getSchoolTree();
  return tree
    .filter((g) => profile.role !== "student" || !profile.grade || g.grade === profile.grade)
    .map((g) => ({
      grade: g.grade,
      title: g.title,
      topics: g.terms.flatMap((t) =>
        t.units.flatMap((u) => u.topics.filter((x) => x.status === "published").map((x) => ({ id: x.id, slug: x.slug, title: x.title, unit: `${u.code} ${u.title}` }))),
      ),
    }))
    .filter((g) => g.topics.length > 0);
});

export type TopicStudy = { explained: number; cards: number; due: number };

/** The viewer's progress on the repeat path, per topic id. */
export async function getStudyProgress(supabase: Supa, uid: string): Promise<{ missing: true } | { missing: false; byTopic: Map<string, TopicStudy>; due: number }> {
  const [cards, expl] = await Promise.all([
    supabase.from("study_cards").select("topic_id, due_at").eq("student_id", uid),
    supabase.from("study_explanations").select("topic_id").eq("student_id", uid),
  ]);
  if (isMissingTable(cards.error) || isMissingTable(expl.error)) return { missing: true };
  const now = Date.now();
  const byTopic = new Map<string, TopicStudy>();
  const at = (id: string) => byTopic.get(id) ?? (byTopic.set(id, { explained: 0, cards: 0, due: 0 }), byTopic.get(id)!);
  let due = 0;
  for (const c of (cards.data ?? []) as { topic_id: string | null; due_at: string }[]) {
    const isDue = new Date(c.due_at).getTime() <= now;
    if (isDue) due += 1;
    if (!c.topic_id) continue;
    const s = at(c.topic_id);
    s.cards += 1;
    if (isDue) s.due += 1;
  }
  for (const e of (expl.data ?? []) as { topic_id: string }[]) at(e.topic_id).explained += 1;
  return { missing: false, byTopic, due };
}

export type TheorySection = { id: string; title: string; blocks: TheoryBlock[] };

/** Sections of the topic's published theory pack, in order. */
export async function getTheorySections(supabase: Supa, topicId: string): Promise<TheorySection[]> {
  const { data } = await supabase
    .from("theory_packs")
    .select("id, theory_sections(id, title, blocks, sort_order)")
    .eq("topic_id", topicId)
    .eq("status", "published")
    .maybeSingle();
  const sections = ((data as { theory_sections: { id: string; title: string; blocks: unknown; sort_order: number }[] } | null)?.theory_sections ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);
  return sections.map((s) => {
    const parsed = theoryBlocksSchema.safeParse(s.blocks);
    return { id: s.id, title: s.title, blocks: parsed.success ? parsed.data : [] };
  });
}

/** Guided notes of the topic (empty when no guided notes file is configured). */
export async function getGuidedNotes(_slug: string): Promise<GuidedNotes[]> {
  void _slug;
  return [];
}

export type StudyQuestion = {
  id: string;
  topic_id: string | null;
  title: string;
  question_text: string;
  question_type: string;
  content: QuestionContent;
  group_stem: string | null;
  options: QuestionOption[];
};

const QUESTION_COLUMNS = "id, topic_id, title, question_text, question_type, content, parent_id, part_order, difficulty, created_at, question_options(key, content, sort_order)";

type QuestionRow = Omit<StudyQuestion, "options" | "group_stem"> & {
  parent_id: string | null;
  part_order: number;
  difficulty: string;
  created_at: string;
  question_options: { key: string; content: string; sort_order: number }[];
};

async function loadStems(supabase: Supa, rows: QuestionRow[]) {
  const ids = [...new Set(rows.flatMap((r) => (r.parent_id ? [r.parent_id] : [])))];
  if (ids.length === 0) return new Map<string, string>();
  const { data } = await supabase
    .from("questions")
    .select("id, question_text")
    .in("id", ids)
    .eq("status", "published")
    .eq("practice_enabled", true)
    .is("archived_at", null);
  return new Map(((data ?? []) as { id: string; question_text: string }[]).map((p) => [p.id, p.question_text]));
}

function toStudy(r: QuestionRow, stems: Map<string, string>): StudyQuestion {
  return {
    id: r.id,
    topic_id: r.topic_id,
    title: r.title,
    question_text: r.question_text,
    question_type: r.question_type,
    content: (r.content ?? {}) as QuestionContent,
    group_stem: r.parent_id ? (stems.get(r.parent_id) ?? null) : null,
    options: [...(r.question_options ?? [])].sort((a, b) => a.sort_order - b.sort_order).map(({ key, content }) => ({ key, content })),
  };
}

/** Practice questions open for recall: published, practice-enabled, of a recallable type. */
function baseQuery(supabase: Supa) {
  return supabase
    .from("questions")
    .select(QUESTION_COLUMNS)
    .eq("status", "published")
    .eq("practice_enabled", true)
    .is("archived_at", null)
    .in("question_type", RECALL_TYPES as unknown as string[]);
}

export async function getTopicQuestions(supabase: Supa, topicId: string): Promise<StudyQuestion[]> {
  const { data } = await baseQuery(supabase).eq("topic_id", topicId).order("created_at");
  const rows = (data ?? []) as unknown as QuestionRow[];
  const order: Record<string, number> = { easy: 0, medium: 1, hard: 2, exam: 3 };
  rows.sort((a, b) => (order[a.difficulty] ?? 1) - (order[b.difficulty] ?? 1) || a.created_at.localeCompare(b.created_at) || a.part_order - b.part_order);
  const stems = await loadStems(supabase, rows);
  return rows.filter((r) => !r.parent_id || stems.has(r.parent_id)).map((r) => toStudy(r, stems));
}

export async function getQuestionsById(supabase: Supa, ids: string[]): Promise<StudyQuestion[]> {
  if (ids.length === 0) return [];
  const { data } = await baseQuery(supabase).in("id", ids);
  const rows = (data ?? []) as unknown as QuestionRow[];
  const stems = await loadStems(supabase, rows);
  return rows.filter((r) => !r.parent_id || stems.has(r.parent_id)).map((r) => toStudy(r, stems));
}
