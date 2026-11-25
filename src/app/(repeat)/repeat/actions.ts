"use server";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingTable } from "@/lib/study/data";
import { NEW_CARD, schedule, type CardState, type Rating } from "@/lib/study/fsrs";
import type { AcceptedAnswers, MarkingPoint, QuestionContent } from "@/lib/questions/types";

// Writes of the repeat site go to the study_* tables only (as the signed-in
// user, RLS applies) — never to practice, marks or analytics of the main site.

const UUID = /^[0-9a-f-]{36}$/i;
const NOT_READY = "The repeat site is not set up in the database yet.";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function saveExplanation(input: { topicId: string; sectionId: string | null; round: 1 | 2; total: number; missed: number[] }): Promise<ActionResult> {
  await requireProfile();
  const { topicId, sectionId, round, total } = input;
  if (!UUID.test(topicId) || (sectionId && !UUID.test(sectionId)) || (round !== 1 && round !== 2)) return { ok: false, error: "Invalid request." };
  if (!Number.isInteger(total) || total < 0 || total > 100) return { ok: false, error: "Invalid request." };
  const missed = [...new Set(input.missed)].filter((i) => Number.isInteger(i) && i >= 0 && i < total);
  const supabase = await createClient();
  const { error } = await supabase
    .from("study_explanations")
    .insert({ topic_id: topicId, theory_section_id: sectionId, round, points_total: total, missed });
  if (isMissingTable(error)) return { ok: false, error: NOT_READY };
  return error ? { ok: false, error: "Could not save. Try again." } : { ok: true };
}

export type Reveal =
  | {
      ok: true;
      /** choice questions: keys of the correct options */
      keys?: string[];
      /** true/false */
      truth?: boolean;
      /** matching: left text → right text */
      pairs?: [string, string][];
      /** accepted short answers / blanks / fields */
      values?: string[];
      /** marking points (what an answer must contain) */
      points?: string[];
    }
  | { ok: false; error: string };

/**
 * The answer of a practice question, in the same scope the main site shows a
 * student after checking (correct options, accepted values, marking points).
 * Model answers and mark-scheme text stay with the teachers.
 */
export async function revealAnswer(questionId: string): Promise<Reveal> {
  const profile = await requireProfile();
  if (!UUID.test(questionId)) return { ok: false, error: "Invalid request." };
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, error: "Answers are not available right now." };
  }
  const { data: q } = await admin
    .from("questions")
    .select("id, question_type, content, question_options(key, content)")
    .eq("id", questionId)
    .eq("status", "published")
    .eq("practice_enabled", true)
    .is("archived_at", null)
    .maybeSingle();
  if (!q) return { ok: false, error: "This question is not available." };
  if (profile.role === "student") {
    const { data: open } = await admin.from("attempts").select("id").eq("student_id", profile.id).eq("status", "IN_PROGRESS").limit(1);
    if (open?.length) return { ok: false, error: "Finish your exam first." };
  }
  const { data: scheme } = await admin
    .from("mark_schemes")
    .select("accepted_answers, marking_points")
    .eq("question_id", questionId)
    .eq("is_current", true)
    .maybeSingle();
  const acc = ((scheme?.accepted_answers ?? {}) as AcceptedAnswers);
  const points = ((scheme?.marking_points ?? []) as MarkingPoint[]).map((p) => p.criterion).filter(Boolean);
  const content = (q.content ?? {}) as QuestionContent;
  const out: Extract<Reveal, { ok: true }> = { ok: true };

  if (q.question_type === "true_false" && typeof acc.correct === "boolean") out.truth = acc.correct;
  else if (typeof acc.correct === "string") out.keys = [acc.correct];
  else if (Array.isArray(acc.correct)) out.keys = acc.correct;
  if (acc.pairs && content.left && content.right) {
    const right = new Map(content.right.map((r) => [r.key, r.text]));
    out.pairs = content.left.map((l) => [l.text, right.get(acc.pairs![l.key]) ?? "—"]);
  }
  const values = [
    ...(acc.blanks ?? []).map((alts) => alts[0]).filter(Boolean),
    ...(acc.values ?? []).slice(0, 3),
    ...Object.values(acc.fields ?? {}).map((alts) => alts[0]).filter(Boolean),
    ...(acc.expression ? [acc.expression] : []),
  ];
  if (values.length) out.values = values;
  if (points.length) out.points = points;
  return out;
}

export async function rateCard(questionId: string, rating: Rating, mode: "recall" | "review"): Promise<ActionResult & { due_at?: string }> {
  await requireProfile();
  if (!UUID.test(questionId) || ![1, 2, 3].includes(rating) || (mode !== "recall" && mode !== "review")) return { ok: false, error: "Invalid request." };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const uid = auth?.claims?.sub as string | undefined;
  if (!uid) return { ok: false, error: "Sign in again." };

  const { data: q } = await supabase
    .from("questions")
    .select("id, topic_id")
    .eq("id", questionId)
    .eq("status", "published")
    .eq("practice_enabled", true)
    .is("archived_at", null)
    .maybeSingle();
  if (!q) return { ok: false, error: "This question is not available." };

  const { data: card, error: readError } = await supabase
    .from("study_cards")
    .select("state, stability, difficulty, reps, lapses, last_review_at")
    .eq("student_id", uid)
    .eq("question_id", questionId)
    .maybeSingle();
  if (isMissingTable(readError)) return { ok: false, error: NOT_READY };

  const next = schedule((card as CardState | null) ?? NEW_CARD, rating);
  const [{ error: cardError }, { error: logError }] = await Promise.all([
    supabase.from("study_cards").upsert({ student_id: uid, question_id: questionId, topic_id: q.topic_id, ...next }),
    supabase.from("study_reviews").insert({ question_id: questionId, topic_id: q.topic_id, mode, rating }),
  ]);
  if (cardError || logError) return { ok: false, error: "Could not save. Try again." };
  return { ok: true, due_at: next.due_at };
}
