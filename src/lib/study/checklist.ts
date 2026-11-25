import type { TheoryBlock } from "@/lib/theory/blocks";

export interface GuidedNotes {
  title?: string;
  blocks: Array<{ text: string; source_reference?: string }>;
}

const NOTE_GAP_RE = /\[\[([^\]]+)\]\]/g;
function noteGaps(text: string): string[] {
  return [...text.matchAll(NOTE_GAP_RE)].map((m) => m[1].trim()).filter(Boolean);
}

// Checklist for the "explain" step of the repeat site: the key points the
// student checks their own explanation against. No AI — taken from the
// lesson's guided notes (the [[answers]] of each block) when the topic has
// them, otherwise from the theory section itself (bold text, defined terms).

export type ChecklistItem = { text: string };

/** All readable text of a theory section, for matching. */
export function sectionText(blocks: TheoryBlock[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case "heading":
        parts.push(b.text);
        break;
      case "definition":
        parts.push(b.term, b.content);
        break;
      case "paragraph":
      case "example":
      case "exam_tip":
      case "warning":
      case "callout":
        parts.push(b.content);
        break;
      case "steps":
      case "list":
        parts.push(...b.items);
        break;
      case "cards":
        b.items.forEach((i) => parts.push(i.title, i.content));
        break;
      case "comparison":
        parts.push(...b.columns, ...b.rows.flat());
        break;
    }
  }
  return parts.join("\n");
}

const clean = (s: string) => s.replace(/[*_`$]/g, "").replace(/\s+/g, " ").trim();

/** Defined terms and **bold** phrases of a section, in order, without repeats. */
export function keyTerms(blocks: TheoryBlock[]): string[] {
  const out: string[] = [];
  const add = (s: string) => {
    const v = clean(s);
    if (v.length >= 2 && v.length <= 120 && !out.some((x) => x.toLowerCase() === v.toLowerCase())) out.push(v);
  };
  for (const b of blocks) {
    if (b.type === "definition") add(b.term);
    for (const m of sectionText([b]).matchAll(/\*\*([^*\n]+)\*\*/g)) add(m[1]);
  }
  return out;
}

const words = (s: string) => s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

/** Loose match that survives Russian endings: long words are compared by their stem. */
function mentions(text: string, answer: string, textWords: Set<string>): boolean {
  const ws = words(answer);
  if (ws.length === 0) return false;
  return ws.every((w) => (w.length < 4 ? textWords.has(w) : text.includes(w.slice(0, Math.max(4, w.length - 2)))));
}

const ANSWER = NOTE_GAP_RE;

/**
 * Checklist for one theory section. Guided-notes blocks are kept when at least
 * half of their answers occur in the section (or always, when the topic has a
 * single section); fewer than three such blocks → the section's key terms.
 */
export function buildChecklist(blocks: TheoryBlock[], notes: GuidedNotes[], singleSection = false): ChecklistItem[] {
  const text = sectionText(blocks).toLowerCase();
  const textWords = new Set(words(text));
  const fromNotes: ChecklistItem[] = [];
  for (const n of notes) {
    for (const b of n.blocks) {
      const answers = noteGaps(b.text);
      if (answers.length === 0) continue;
      const hits = answers.filter((a) => mentions(text, a, textWords)).length;
      if (singleSection || hits * 2 >= answers.length) fromNotes.push({ text: b.text.replace(ANSWER, "**$1**") });
    }
  }
  if (fromNotes.length >= 3) return fromNotes.slice(0, 20);
  return keyTerms(blocks)
    .slice(0, 15)
    .map((term) => ({ text: `**${term}**` }));
}
