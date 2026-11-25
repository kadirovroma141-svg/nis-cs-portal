import { describe, expect, it } from "vitest";
import { NEW_CARD, retrievability, schedule } from "@/lib/study/fsrs";
import { buildChecklist, keyTerms, type GuidedNotes } from "@/lib/study/checklist";
import type { TheoryBlock } from "@/lib/theory/blocks";

const DAY = 86_400_000;
const t0 = new Date("2026-10-30T08:00:00Z");
const days = (iso: string, from: Date) => (new Date(iso).getTime() - from.getTime()) / DAY;

describe("FSRS scheduler", () => {
  it("gives new cards longer first intervals for better ratings and brings misses back the same day", () => {
    const again = schedule(NEW_CARD, 1, t0);
    const hard = schedule(NEW_CARD, 2, t0);
    const good = schedule(NEW_CARD, 3, t0);
    expect(days(again.due_at, t0) * 24 * 60).toBeCloseTo(10);
    expect(days(hard.due_at, t0)).toBe(1);
    expect(days(good.due_at, t0)).toBe(4);
    expect(good.state).toBe(2);
    expect(again.state).toBe(1);
  });

  it("grows the interval on success and shrinks stability on a lapse", () => {
    const first = schedule(NEW_CARD, 3, t0);
    const later = new Date(first.due_at);
    const second = schedule(first, 3, later);
    expect(second.stability).toBeGreaterThan(first.stability);
    expect(days(second.due_at, later)).toBeGreaterThan(days(first.due_at, t0));
    const lapse = schedule(second, 1, new Date(second.due_at));
    expect(lapse.stability).toBeLessThan(second.stability);
    expect(lapse.lapses).toBe(1);
    expect(lapse.state).toBe(3);
  });

  it("predicts 90 % recall at an interval equal to stability", () => {
    expect(retrievability(10, 10)).toBeCloseTo(0.9, 5);
  });
});

const blocks: TheoryBlock[] = [
  { type: "definition", term: "Операционная система", content: "**Комплекс программ**, который управляет ресурсами компьютера." },
  { type: "paragraph", content: "**Драйвер** позволяет ОС работать с принтером. Ядро управляет памятью и процессами." },
];

describe("explain checklist", () => {
  it("takes defined terms and bold text of the section", () => {
    expect(keyTerms(blocks)).toEqual(["Операционная система", "Комплекс программ", "Драйвер"]);
  });

  it("uses guided-notes blocks whose answers occur in the section, despite word endings", () => {
    const notes: GuidedNotes[] = [{
      title: "ОС",
      blocks: [
        { text: "ОС — это [[комплекс программ]].", source_reference: "SB, стр. 45" },
        { text: "[[Драйвер]] нужен для принтера.", source_reference: "SB, стр. 45" },
        { text: "Ядро управляет [[памятью]].", source_reference: "SB, стр. 46" },
        { text: "Раздел диска — [[системный]].", source_reference: "SB, стр. 46" },
      ],
    }];
    const items = buildChecklist(blocks, notes);
    expect(items.map((i) => i.text)).toEqual(["ОС — это **комплекс программ**.", "**Драйвер** нужен для принтера.", "Ядро управляет **памятью**."]);
  });

  it("falls back to key terms when the notes do not match the section", () => {
    const items = buildChecklist(blocks, []);
    expect(items.map((i) => i.text)).toEqual(["**Операционная система**", "**Комплекс программ**", "**Драйвер**"]);
  });
});
