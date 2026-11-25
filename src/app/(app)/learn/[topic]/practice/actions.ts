"use server";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { gradeAnswer, gradeAnswers, type GradeInput, type GradeOutcome } from "@/lib/grading/engine";
import { getGradingSettings } from "@/lib/grading/attempt-grader";
import type { MarkingPointResult } from "@/lib/grading/deterministic";
import type { AcceptedAnswers, AnswerData, MarkingEntry, MarkingPoint } from "@/lib/questions/types";
import type { MarkScheme, Question } from "@/lib/db-types";

export type PracticeResult =
  | {
      ok: true;
      awarded: number | null;
      max: number;
      feedback: string | null;
      points: MarkingPointResult[];
      needsReview: boolean;
      correctKeys?: string[];
      fullMarks: boolean;
    }
  | { ok: false; error: string };

export type PracticeReveal =
  | { ok: true; explanation: string | null; markScheme: string | null; modelAnswer: string | null; points: MarkingPoint[] }
  | { ok: false; error: string };

const LIMITS = { perMinute: 30, aiPerTenMinutes: 20 };

/**
 * Loads a question and its current mark scheme for practice, refusing when the
 * question is not open for practice or is part of an exam the student is sitting.
 */
async function loadForPractice(studentId: string, questionId: string) {
  const admin = createAdminClient();
  const { data: q } = await admin
    .from("questions")
    .select("*, question_objectives(learning_objectives(code)), parent:parent_id(question_text)")
    .eq("id", questionId)
    .eq("status", "published")
    .eq("practice_enabled", true)
    .is("archived_at", null)
    .maybeSingle();
  if (!q) return { error: "This question is not available for practice." } as const;

  const { data: open } = await admin
    .from("attempts")
    .select("exam_version_id")
    .eq("student_id", studentId)
    .eq("status", "IN_PROGRESS");
  if (open?.length) {
    const { data: payloads } = await admin
      .from("exam_version_payloads")
      .select("paper")
      .in("exam_version_id", open.map((o) => o.exam_version_id));
    const inExam = (payloads ?? []).some((p) =>
      ((p.paper as { questions: { id: string }[] }).questions ?? []).some((x) => x.id === questionId),
    );
    if (inExam) return { error: "Finish your exam before practising this question." } as const;
  }

  const { data: scheme } = await admin
    .from("mark_schemes")
    .select("*")
    .eq("question_id", questionId)
    .eq("is_current", true)
    .maybeSingle();
  return { admin, question: q as Question & {
      question_objectives: { learning_objectives: { code: string } }[];
      parent: { question_text: string } | null;
    }, scheme: scheme as MarkScheme | null };
}

function correctKeysOf(accepted: AcceptedAnswers): string[] | undefined {
  const c = accepted.correct;
  if (typeof c === "string") return [c];
  if (Array.isArray(c)) return c;
  return undefined;
}

type Loaded = Exclude<Awaited<ReturnType<typeof loadForPractice>>, { error: string }>;
type Profile = Awaited<ReturnType<typeof requireProfile>>;

function markingOf(question: Loaded["question"], scheme: MarkScheme): MarkingEntry {
  return {
    question_type: question.question_type,
    grading_method: question.grading_method,
    marks: question.marks,
    command_word: question.command_word,
    mark_scheme: scheme.mark_scheme,
    marking_points: scheme.marking_points,
    model_answer: scheme.model_answer,
    accepted_answers: scheme.accepted_answers,
    ai_grading_instructions: scheme.ai_grading_instructions,
    explanation: scheme.explanation,
  };
}

function gradeInputOf(question: Loaded["question"], scheme: MarkScheme, answer: AnswerData | null, threshold: number): GradeInput {
  return {
    questionText: question.question_text,
    questionType: question.question_type,
    objectives: question.question_objectives.map((o) => o.learning_objectives.code),
    marking: markingOf(question, scheme),
    answer,
    aiConfidenceThreshold: threshold,
    content: question.content,
    groupStem: question.parent?.question_text ?? null,
    questionId: question.id,
    context: "practice",
  };
}

/** Turns an outcome into what the student sees, and stores it (or the draft). */
async function recordPractice(
  admin: Loaded["admin"],
  profile: Profile,
  questionId: string,
  scheme: MarkScheme,
  answer: AnswerData | null,
  outcome: GradeOutcome,
): Promise<PracticeResult> {
  if (outcome.status === "FAILED") {
    return { ok: false, error: "Automatic feedback is temporarily unavailable. Try again later." };
  }

  const result: Extract<PracticeResult, { ok: true }> = {
    ok: true,
    awarded: outcome.awarded,
    max: outcome.max,
    feedback:
      outcome.feedback ??
      (outcome.needsReview ? "This answer cannot be marked automatically — ask your teacher to check it." : null),
    points: outcome.points,
    needsReview: outcome.needsReview,
    correctKeys: outcome.awarded !== null ? correctKeysOf(scheme.accepted_answers) : undefined,
    fullMarks: outcome.awarded === outcome.max,
  };

  // Only marked practice counts towards mastery (blank answers are not recorded).
  if (outcome.awarded !== null && answer) {
    await admin.from("practice_attempts").insert({
      student_id: profile.id,
      question_id: questionId,
      answer_data: answer,
      awarded_mark: outcome.awarded,
      max_mark: outcome.max,
      grading_method: outcome.method,
      feedback: outcome.feedback,
      result,
    });
    // The checked answer replaces any draft.
    await admin.from("practice_drafts").delete().eq("student_id", profile.id).eq("question_id", questionId);
  } else if (answer) {
    // Not marked automatically: keep the answer and the message with the draft.
    await admin
      .from("practice_drafts")
      .upsert({ student_id: profile.id, question_id: questionId, answer_data: answer, result, updated_at: new Date().toISOString() });
  }
  return result;
}

async function afterPractice(admin: Loaded["admin"], profile: Profile) {
  await admin.rpc("recompute_mastery", { p_student_id: profile.id });
  await admin.from("profiles").update({ last_activity_at: new Date().toISOString() }).eq("id", profile.id);
}

async function recentCounts(admin: Loaded["admin"], studentId: string) {
  const [{ count: recent }, { count: aiRecent }] = await Promise.all([
    admin
      .from("practice_attempts")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .gte("created_at", new Date(Date.now() - 60_000).toISOString()),
    admin
      .from("practice_attempts")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .in("grading_method", ["AI", "HYBRID"])
      .gte("created_at", new Date(Date.now() - 10 * 60_000).toISOString()),
  ]);
  return { recent: recent ?? 0, aiRecent: aiRecent ?? 0 };
}

const TOO_FAST = "You are checking answers very quickly. Wait a moment and try again.";
const AI_LIMIT = "AI feedback limit reached for now. Try again in a few minutes.";

export async function checkPracticeAnswer(questionId: string, answer: AnswerData | null): Promise<PracticeResult> {
  const profile = await requireProfile();
  const loaded = await loadForPractice(profile.id, questionId);
  if ("error" in loaded) return { ok: false, error: loaded.error ?? "Unavailable" };
  const { admin, question, scheme } = loaded;
  if (!scheme) return { ok: false, error: "This question has no mark scheme yet." };
  if (JSON.stringify(answer ?? {}).length > 60_000) return { ok: false, error: "Your answer is too long." };

  const { recent, aiRecent } = await recentCounts(admin, profile.id);
  if (recent >= LIMITS.perMinute) return { ok: false, error: TOO_FAST };
  const usesAI = question.grading_method === "AI" || question.grading_method === "HYBRID";
  if (usesAI && aiRecent >= LIMITS.aiPerTenMinutes) return { ok: false, error: AI_LIMIT };

  const settings = await getGradingSettings(admin);
  const outcome = await gradeAnswer(gradeInputOf(question, scheme, answer, settings.threshold));
  const result = await recordPractice(admin, profile, questionId, scheme, answer, outcome);
  if (result.ok && result.awarded !== null && answer) await afterPractice(admin, profile);
  return result;
}

/**
 * "Check all": marks every given answer together — objective answers in code,
 * all written answers in ONE AI request. Results are by question id.
 */
export async function checkPracticeAnswers(
  items: { questionId: string; answer: AnswerData | null }[],
): Promise<Record<string, PracticeResult>> {
  const profile = await requireProfile();
  const out: Record<string, PracticeResult> = {};
  const unique = [...new Map(items.slice(0, 40).map((i) => [i.questionId, i])).values()].filter((i) => /^[0-9a-f-]{36}$/i.test(i.questionId));
  if (!unique.length) return out;

  const loadedAll = await Promise.all(unique.map((i) => loadForPractice(profile.id, i.questionId)));
  const admin = createAdminClient();
  const { recent, aiRecent } = await recentCounts(admin, profile.id);
  if (recent >= LIMITS.perMinute) {
    for (const i of unique) out[i.questionId] = { ok: false, error: TOO_FAST };
    return out;
  }
  let aiBudget = LIMITS.aiPerTenMinutes - aiRecent;

  const ready: { item: (typeof unique)[number]; question: Loaded["question"]; scheme: MarkScheme }[] = [];
  unique.forEach((item, k) => {
    const loaded = loadedAll[k];
    if ("error" in loaded) return void (out[item.questionId] = { ok: false, error: loaded.error ?? "Unavailable" });
    if (!loaded.scheme) return void (out[item.questionId] = { ok: false, error: "This question has no mark scheme yet." });
    if (JSON.stringify(item.answer ?? {}).length > 60_000) return void (out[item.questionId] = { ok: false, error: "Your answer is too long." });
    const usesAI = loaded.question.grading_method === "AI" || loaded.question.grading_method === "HYBRID";
    if (usesAI) {
      if (aiBudget <= 0) return void (out[item.questionId] = { ok: false, error: AI_LIMIT });
      aiBudget--;
    }
    ready.push({ item, question: loaded.question, scheme: loaded.scheme });
  });
  if (!ready.length) return out;

  const settings = await getGradingSettings(admin);
  const outcomes = await gradeAnswers(ready.map((r) => gradeInputOf(r.question, r.scheme, r.item.answer, settings.threshold)));
  let marked = false;
  for (let k = 0; k < ready.length; k++) {
    const { item, scheme } = ready[k];
    const result = await recordPractice(admin, profile, item.questionId, scheme, item.answer, outcomes[k]);
    if (result.ok && result.awarded !== null && item.answer) marked = true;
    out[item.questionId] = result;
  }
  if (marked) await afterPractice(admin, profile);
  return out;
}

/**
 * Autosaves the answer a student is working on (answer = null after "Retry").
 * The newest of the draft and the latest checked attempt is shown on reload.
 */
export async function savePracticeDraft(questionId: string, answer: AnswerData | null): Promise<{ ok: boolean }> {
  const profile = await requireProfile();
  if (!/^[0-9a-f-]{36}$/i.test(questionId)) return { ok: false };
  if (JSON.stringify(answer ?? {}).length > 60_000) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase
    .from("practice_drafts")
    .upsert({ student_id: profile.id, question_id: questionId, answer_data: answer, result: null, updated_at: new Date().toISOString() });
  return { ok: !error };
}

export async function revealPractice(questionId: string): Promise<PracticeReveal> {
  const profile = await requireProfile();
  // Explanations, mark schemes and model answers are for staff only.
  if (profile.role === "student") return { ok: false, error: "The mark scheme is available to teachers only." };
  const loaded = await loadForPractice(profile.id, questionId);
  if ("error" in loaded) return { ok: false, error: loaded.error ?? "Unavailable" };
  const { scheme } = loaded;
  if (!scheme) return { ok: false, error: "This question has no mark scheme yet." };
  return {
    ok: true,
    explanation: scheme.explanation,
    markScheme: scheme.mark_scheme || null,
    modelAnswer: scheme.model_answer,
    points: scheme.marking_points ?? [],
  };
}
