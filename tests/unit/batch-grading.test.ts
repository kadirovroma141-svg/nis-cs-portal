import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.OPENAI_API_KEY = "test-key";
});
vi.mock("server-only", () => ({}));
// No database in unit tests: the cache misses and the usage log is dropped.
vi.mock("../../src/lib/supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("no database in unit tests");
  },
}));

import { buildBatchMessage, parseBatchResponse, type AiBatchItem, type AiMarkingInput } from "../../src/lib/grading/ai";
import { chunkJobs, gradeAnswers, type GradeInput } from "../../src/lib/grading/engine";
import type { MarkingEntry } from "../../src/lib/questions/types";

const aiInput = (maxMark: number, text = "Explain X"): AiMarkingInput => ({
  questionText: text, questionType: "short_answer", maxMark, commandWord: "explain", markScheme: "point A; point B",
  markingPoints: [], modelAnswer: null, acceptedAlternatives: [], aiInstructions: null, objectives: [], answer: { text: "because A" },
});

const item = (id: string, max = 2): AiBatchItem => ({ id, input: aiInput(max) });

const result = (id: string, awarded: number, max = 2, extra: Record<string, unknown> = {}) => ({
  id, awarded_mark: awarded, max_mark: max, confidence: 0.95, marking_points: [], feedback: "ok", reason: "met A", needs_teacher_review: false, ...extra,
});

describe("parseBatchResponse", () => {
  it("keeps valid items and reports broken or missing ones", () => {
    const items = [item("q1"), item("q2"), item("q3")];
    const r = parseBatchResponse(items, { results: [result("q1", 2), { id: "q2", awarded_mark: "two" }, result("zz", 1)] }, "m");
    expect([...r.results.keys()]).toEqual(["q1"]);
    expect(r.results.get("q1")?.reason).toBe("met A");
    expect(r.invalid.get("q2")).toMatch(/malformed/);
    expect(r.invalid.get("q3")).toMatch(/no result/);
    expect(r.invalid.has("zz")).toBe(false);
  });

  it("never awards more than the maximum and flags it for review", () => {
    const r = parseBatchResponse([item("q1", 2)], { results: [result("q1", 7)] }, "m");
    expect(r.results.get("q1")?.awarded).toBe(2);
    expect(r.results.get("q1")?.needsReview).toBe(true);
  });

  it("uses the first valid result when an id is repeated", () => {
    const r = parseBatchResponse([item("q1")], { results: [result("q1", 1), result("q1", 2)] }, "m");
    expect(r.results.get("q1")?.awarded).toBe(1);
  });

  it("treats a response without results as all missing", () => {
    const r = parseBatchResponse([item("q1")], { nope: true }, "m");
    expect(r.results.size).toBe(0);
    expect(r.invalid.size).toBe(1);
  });
});

describe("buildBatchMessage", () => {
  it("puts every item in one message with tagged answer markers", () => {
    const msg = buildBatchMessage([item("q1"), item("q2")], "abc");
    expect(msg).toContain("### ITEM q1");
    expect(msg).toContain("### ITEM q2");
    expect(msg.match(/<<<ANSWER_abc/g)).toHaveLength(2);
  });
});

describe("chunkJobs", () => {
  it("splits only very large batches", () => {
    expect(chunkJobs([{ size: 10 }, { size: 10 }])).toHaveLength(1);
    expect(chunkJobs([{ size: 10 }, { size: 10 }, { size: 10 }], 2)).toHaveLength(2);
    expect(chunkJobs([{ size: 100 }, { size: 100 }], 30, 150)).toHaveLength(2);
  });
});

// ---------------------------------------------------------------- gradeAnswers with a fake OpenAI

const marking = (method: MarkingEntry["grading_method"], marks: number, type: MarkingEntry["question_type"] = "short_answer"): MarkingEntry => ({
  question_type: type, grading_method: method, marks, command_word: "explain", mark_scheme: "A; B", marking_points: [],
  model_answer: null, accepted_answers: type === "mcq" ? { correct: "B" } : {}, ai_grading_instructions: null, explanation: null,
});

const input = (m: MarkingEntry, answer: GradeInput["answer"]): GradeInput => ({
  questionText: "Q", questionType: m.question_type, objectives: [], marking: m, answer, aiConfidenceThreshold: 0.8, context: "exam",
});

const reply = (results: unknown[]) =>
  new Response(JSON.stringify({ model: "gpt-test", choices: [{ message: { content: JSON.stringify({ results }) } }], usage: {} }), { status: 200 });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("gradeAnswers", () => {
  const exam = () => [
    input(marking("AUTO", 1, "mcq"), { selected: "B" }), // code
    input(marking("AI", 2), { text: "because A" }),
    input(marking("AI", 3), { text: "because B" }),
    input(marking("AI", 2), null), // blank
  ];

  it("marks all AI answers in one request and objective ones in code", async () => {
    fetchMock.mockResolvedValueOnce(reply([result("q2", 1), result("q3", 3, 3)]));
    const out = await gradeAnswers(exam());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(out.map((o) => o.awarded)).toEqual([1, 1, 3, 0]);
    expect(out[1].reason).toBe("met A");
    expect(out.every((o) => o.status === "COMPLETE")).toBe(true);
  });

  it("re-asks only for broken items, then sends them to the teacher", async () => {
    fetchMock
      .mockResolvedValueOnce(reply([result("q2", 2), { id: "q3", bad: true }]))
      .mockResolvedValueOnce(reply([{ id: "q3", bad: true }]));
    const out = await gradeAnswers(exam());
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).messages[1].content).not.toContain("ITEM q2");
    expect(out[1].awarded).toBe(2);
    expect(out[2]).toMatchObject({ status: "COMPLETE", awarded: null, needsReview: true });
    expect(out[2].error).toMatch(/teacher marking required/);
  });

  it("retries a failed request once, then leaves items FAILED for the cron", async () => {
    fetchMock.mockResolvedValue(new Response("down", { status: 503 }));
    const out = await gradeAnswers(exam());
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(out[0].status).toBe("COMPLETE");
    expect(out[1].status).toBe("FAILED");
    expect(out[2].status).toBe("FAILED");
  });

  it("recovers when the retry succeeds", async () => {
    fetchMock.mockRejectedValueOnce(new Error("timeout")).mockResolvedValueOnce(reply([result("q2", 0), result("q3", 1, 3)]));
    const out = await gradeAnswers(exam());
    expect(out.map((o) => o.awarded)).toEqual([1, 0, 1, 0]);
  });
});
