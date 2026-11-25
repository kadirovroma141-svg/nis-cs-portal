import "server-only";
import { gradeDeterministic, type MarkingPointResult } from "./deterministic";
import {
  AiUnavailableError,
  BATCH_PROMPT_VERSION,
  answerAsText,
  gradeBatchWithAI,
  type AiMarkingInput,
  type AiMarkingResult,
} from "./ai";
import { cacheKey, effortFor, getCachedMarking, logAiUsage, putCachedMarking, type Effort } from "./ai-cache";
import { isAnswerBlank, type AnswerData, type MarkingEntry, type QuestionContent, type QuestionType } from "../questions/types";

export type GradeOutcome = {
  /** FAILED = transient error (e.g. OpenAI down); the grader retries later. */
  status: "COMPLETE" | "FAILED";
  method: MarkingEntry["grading_method"];
  awarded: number | null;
  max: number;
  confidence: number | null;
  points: MarkingPointResult[];
  feedback: string | null;
  /** AI's note for the teacher: why this mark */
  reason?: string | null;
  needsReview: boolean;
  originalAiMark: number | null;
  aiModel: string | null;
  promptVersion: string | null;
  error: string | null;
};

export type GradeInput = {
  questionText: string;
  questionType: QuestionType;
  objectives: string[];
  marking: MarkingEntry;
  answer: AnswerData | null;
  aiConfidenceThreshold: number;
  examInstructions?: string | null;
  content?: QuestionContent;
  /** Stem shared by the parts of a structured question */
  groupStem?: string | null;
  /** for the AI result cache and the usage log */
  questionId?: string;
  context?: "practice" | "exam";
};

function base(input: GradeInput): GradeOutcome {
  return {
    status: "COMPLETE",
    method: input.marking.grading_method,
    awarded: null,
    max: input.marking.marks,
    confidence: null,
    points: [],
    feedback: null,
    needsReview: false,
    originalAiMark: null,
    aiModel: null,
    promptVersion: null,
    error: null,
  };
}

/** Scale a mark obtained against the question's own marks to the exam's marks. */
function rescale(mark: number, from: number, to: number) {
  if (from === to || from <= 0) return mark;
  return Math.round((mark * to) / from);
}

/** An answer that needs the AI examiner, with everything needed to finish it. */
type AiJob = {
  id: string;
  input: GradeInput;
  out: GradeOutcome;
  aiInput: AiMarkingInput;
  effort: Effort;
  key: string | null;
  questionMarks: number;
  /** deterministic mark of a HYBRID question, kept if the AI cannot mark it */
  provisional: number | null;
  /** prompt size, for splitting very large batches */
  size: number;
};

/**
 * Decides everything that does not need the AI: blank answers, MANUAL
 * questions and objective answers (marked deterministically — fast, free,
 * reliable). Written answers come back as an AI job.
 */
function prepare(input: GradeInput, id: string): { done: GradeOutcome } | { job: AiJob } {
  const out = base(input);
  const { marking } = input;
  const max = marking.marks;

  if (isAnswerBlank(input.answer)) {
    return { done: { ...out, awarded: 0, feedback: "No answer was given." } };
  }

  const method = marking.grading_method;
  if (method === "MANUAL") return { done: { ...out, needsReview: true, feedback: null } };

  let provisional: number | null = null;
  if (method === "AUTO" || method === "HYBRID") {
    const det = gradeDeterministic(input.questionType, max, marking.accepted_answers, input.answer);
    if (det.decided && (method === "AUTO" || det.fullyCorrect)) {
      return { done: { ...out, awarded: det.awarded, points: det.points, feedback: det.feedback } };
    }
    if (method === "AUTO") {
      // No usable answer key: a teacher has to mark it.
      return { done: { ...out, needsReview: true, error: det.decided ? null : det.reason } };
    }
    if (det.decided) provisional = det.awarded;
  }

  const questionMarks = marking.question_marks ?? max;
  const effort = effortFor(input.questionType, questionMarks);
  const aiInput: AiMarkingInput = {
    questionText: input.questionText,
    questionType: input.questionType,
    maxMark: questionMarks,
    commandWord: marking.command_word,
    markScheme: marking.mark_scheme,
    markingPoints: marking.marking_points ?? [],
    modelAnswer: marking.model_answer,
    acceptedAlternatives: marking.accepted_answers?.values ?? [],
    aiInstructions: marking.ai_grading_instructions,
    objectives: input.objectives,
    examInstructions: input.examInstructions,
    groupStem: input.groupStem ?? marking.group_stem ?? null,
    content: input.content,
    answer: input.answer!,
  };
  const { answer: _answer, ...promptInputs } = aiInput;
  void _answer;
  const answerText = answerAsText(aiInput.answer, input.questionType, input.content);
  const key = input.questionId
    ? cacheKey({ questionId: input.questionId, promptInputs, answerText, effort })
    : null;
  const size = answerText.length + JSON.stringify(promptInputs).length;
  return { job: { id, input, out, aiInput, effort, key, questionMarks, provisional, size } };
}

function finish(job: AiJob, ai: Omit<AiMarkingResult, "usage">): GradeOutcome {
  const awarded = Math.max(0, Math.min(job.out.max, rescale(ai.awarded, job.questionMarks, job.out.max)));
  return {
    ...job.out,
    awarded,
    originalAiMark: awarded,
    confidence: ai.confidence,
    points: ai.points,
    feedback: ai.feedback,
    reason: ai.reason ?? null,
    needsReview: ai.needsReview || ai.confidence < job.input.aiConfidenceThreshold,
    aiModel: ai.model,
    promptVersion: BATCH_PROMPT_VERSION,
  };
}

/** The AI answered, but not usably for this question: the teacher marks it (nothing is lost). */
function teacherNeeded(job: AiJob, why: string): GradeOutcome {
  return { ...job.out, awarded: job.provisional, needsReview: true, error: `${why} — teacher marking required.` };
}

const EFFORT_ORDER: Effort[] = ["minimal", "low", "medium", "high"];
const maxEffort = (jobs: AiJob[]) =>
  jobs.reduce<Effort>((m, j) => (EFFORT_ORDER.indexOf(j.effort) > EFFORT_ORDER.indexOf(m) ? j.effort : m), "minimal");

/** Keeps a request to a sensible size; a normal exam fits in one. */
export function chunkJobs<T extends { size: number }>(jobs: T[], maxItems = 30, maxChars = 120_000): T[][] {
  const chunks: T[][] = [];
  let cur: T[] = [];
  let chars = 0;
  for (const j of jobs) {
    if (cur.length && (cur.length >= maxItems || chars + j.size > maxChars)) {
      chunks.push(cur);
      cur = [];
      chars = 0;
    }
    cur.push(j);
    chars += j.size;
  }
  if (cur.length) chunks.push(cur);
  return chunks;
}

/**
 * Marks a chunk in one request. A failed request is retried once; items that
 * come back broken get one more request of their own. Items still broken go to
 * the teacher (the rest of the attempt is kept); a request that keeps failing
 * leaves its items FAILED, so the retry cron tries again later.
 */
async function markChunk(jobs: AiJob[], context: GradeInput["context"]): Promise<Map<string, GradeOutcome>> {
  const done = new Map<string, GradeOutcome>();
  let pending = jobs;
  let failures = 0;
  let itemRetryUsed = false;
  while (pending.length) {
    const effort = maxEffort(pending);
    let r: Awaited<ReturnType<typeof gradeBatchWithAI>>;
    try {
      r = await gradeBatchWithAI(pending.map((j) => ({ id: j.id, input: j.aiInput })), { effort });
    } catch (e) {
      if (e instanceof AiUnavailableError) {
        // Not transient: send to the teacher instead of retrying forever.
        for (const j of pending) {
          done.set(j.id, { ...j.out, awarded: j.provisional, needsReview: true, error: "AI marking is not configured — teacher marking required." });
        }
        return done;
      }
      if (++failures >= 2) {
        for (const j of pending) done.set(j.id, { ...j.out, status: "FAILED", error: (e as Error).message.slice(0, 500) });
        return done;
      }
      continue;
    }
    await logAiUsage({
      context: context ?? "other",
      questionId: pending.length === 1 ? pending[0].input.questionId : null,
      model: r.model,
      effort,
      cacheHit: false,
      usage: r.usage,
    });
    for (const j of pending) {
      const ai = r.results.get(j.id);
      if (!ai) continue;
      done.set(j.id, finish(j, ai));
      if (j.key && j.input.questionId) await putCachedMarking(j.key, j.input.questionId, ai, j.input.aiConfidenceThreshold);
    }
    const broken = pending.filter((j) => !r.results.has(j.id));
    if (!broken.length) break;
    // broken items get one request of their own; a fully unusable response counts as a failed request
    const giveUp = itemRetryUsed || (broken.length === pending.length && ++failures >= 2);
    if (giveUp) {
      for (const j of broken) done.set(j.id, teacherNeeded(j, r.invalid.get(j.id) ?? "AI returned no result for this question"));
      break;
    }
    if (broken.length < pending.length) itemRetryUsed = true;
    pending = broken;
  }
  return done;
}

/**
 * Marks many answers together: objective answers in code, written answers by
 * the AI examiner in ONE request for all of them (reused results come from the
 * cache). Returns one outcome per input, in order.
 */
export async function gradeAnswers(inputs: GradeInput[]): Promise<GradeOutcome[]> {
  const outcomes: (GradeOutcome | undefined)[] = new Array(inputs.length);
  const jobs: AiJob[] = [];
  inputs.forEach((input, i) => {
    const p = prepare(input, `q${i + 1}`);
    if ("done" in p) outcomes[i] = p.done;
    else jobs.push(p.job);
  });
  const index = new Map(jobs.map((j) => [j.id, Number(j.id.slice(1)) - 1]));

  const toAsk: AiJob[] = [];
  await Promise.all(
    jobs.map(async (j) => {
      const cached = j.key ? await getCachedMarking(j.key) : null;
      if (!cached) return toAsk.push(j);
      await logAiUsage({ context: j.input.context ?? "other", questionId: j.input.questionId, model: cached.model, effort: j.effort, cacheHit: true });
      outcomes[index.get(j.id)!] = finish(j, cached);
    }),
  );
  toAsk.sort((a, b) => index.get(a.id)! - index.get(b.id)!);

  const context = inputs[0]?.context;
  const results = await Promise.all(chunkJobs(toAsk).map((chunk) => markChunk(chunk, context)));
  for (const m of results) for (const [id, o] of m) outcomes[index.get(id)!] = o;
  return outcomes.map((o, i) => o ?? { ...base(inputs[i]), status: "FAILED", error: "Not marked" });
}

/** Marks one answer (practice "Check"): same path as a batch of one. */
export async function gradeAnswer(input: GradeInput): Promise<GradeOutcome> {
  return (await gradeAnswers([input]))[0];
}
