import "server-only";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { SchoolTree, PaperTree, TopicDetail, TopicRef } from "./curriculum";
import type { ProgressContext, ProgressTopic, ProgressLO } from "./progress";
import type { PracticeQuestion } from "@/components/practice/practice-session";

const ROOT = process.cwd();

type CurriculumGrade = {
  number: number;
  title: string;
  terms: {
    number: number;
    title: string;
    hours: number | null;
    units: {
      code: string;
      title: string;
      topics: {
        slug: string;
        title: string;
        lessons?: string;
        hours?: number | null;
        period?: string;
        resources?: string;
        objectives?: string[];
      }[];
    }[];
  }[];
};

type CurriculumJson = {
  code: string;
  title: string;
  academic_year: string;
  grades: CurriculumGrade[];
  objectives?: { code: string; description: string }[];
  papers?: { number: number; title: string; groups: { title: string; sections: { code?: string; title: string }[] }[] }[];
  exam_only_topics?: { slug: string; title: string; objectives: string[]; placements: { paper: number; section: string }[] }[];
};

type ExamSpecJson = {
  papers: {
    number: number;
    title: string;
    groups: {
      title: string;
      sections: {
        code: string;
        title: string;
        objectives: { code: string; description: string }[];
      }[];
    }[];
  }[];
};

let cachedCurriculum: CurriculumJson | null = null;
let cachedExamSpec: ExamSpecJson | null = null;

export function getLocalCurriculum(): CurriculumJson {
  if (!cachedCurriculum) {
    const file = join(ROOT, "content/curriculum/NIS_CS_2026_2027.json");
    cachedCurriculum = JSON.parse(readFileSync(file, "utf8")) as CurriculumJson;
  }
  return cachedCurriculum;
}

export function getLocalExamSpec(): ExamSpecJson {
  if (!cachedExamSpec) {
    const file = join(ROOT, "content/curriculum/exam_spec.json");
    if (existsSync(file)) {
      cachedExamSpec = JSON.parse(readFileSync(file, "utf8")) as ExamSpecJson;
    } else {
      cachedExamSpec = { papers: [] };
    }
  }
  return cachedExamSpec;
}

export function getLocalSchoolTree(): SchoolTree {
  const curr = getLocalCurriculum();
  return curr.grades.map((g) => ({
    grade: g.number,
    title: g.title,
    terms: g.terms.map((t) => ({
      id: `term-${g.number}-${t.number}`,
      number: t.number,
      title: t.title,
      hours: t.hours,
      units: t.units.map((u, uIdx) => ({
        id: `unit-${g.number}-${t.number}-${uIdx}`,
        code: u.code,
        title: u.title,
        hiddenTopics: 0,
        topics: u.topics.map((top) => ({
          id: top.slug,
          slug: top.slug,
          title: top.title,
          status: "published",
          recommended_minutes: (top.hours ?? 2) * 45,
          lessons: top.lessons || null,
          period: top.period || null,
        })),
      })),
    })),
  }));
}

export function getLocalPaperTree(): PaperTree {
  const spec = getLocalExamSpec();
  const curr = getLocalCurriculum();
  const allTopics: TopicRef[] = [];
  for (const g of curr.grades) {
    for (const t of g.terms) {
      for (const u of t.units) {
        for (const top of u.topics) {
          allTopics.push({
            id: top.slug,
            slug: top.slug,
            title: top.title,
            status: "published",
            recommended_minutes: (top.hours ?? 2) * 45,
          });
        }
      }
    }
  }
  if (curr.exam_only_topics) {
    for (const e of curr.exam_only_topics) {
      allTopics.push({
        id: e.slug,
        slug: e.slug,
        title: e.title,
        status: "published",
        recommended_minutes: 90,
      });
    }
  }

  return spec.papers.map((p) => ({
    id: `paper-${p.number}`,
    number: p.number,
    title: p.title,
    groups: p.groups.map((g, gIdx) => ({
      id: `group-${p.number}-${gIdx}`,
      title: g.title,
      sections: g.sections.map((s, sIdx) => {
        const secLos = new Set(s.objectives.map((o) => o.code));
        const matched = allTopics.filter((top) => {
          const tDetail = getLocalTopic(top.slug);
          return tDetail?.objectives.some((o) => secLos.has(o.code));
        });
        return {
          id: `sec-${p.number}-${gIdx}-${sIdx}`,
          code: s.code || null,
          title: s.title,
          topics: matched,
        };
      }),
    })),
  }));
}

export function getLocalTopic(slug: string): TopicDetail | null {
  const curr = getLocalCurriculum();
  const spec = getLocalExamSpec();
  const loMap = new Map<string, string>();
  if (curr.objectives) {
    for (const o of curr.objectives) loMap.set(o.code, o.description);
  }
  for (const p of spec.papers) {
    for (const g of p.groups) {
      for (const s of g.sections) {
        for (const o of s.objectives) {
          if (!loMap.has(o.code)) loMap.set(o.code, o.description);
        }
      }
    }
  }

  // Check in grades
  for (const g of curr.grades) {
    for (const t of g.terms) {
      for (const u of t.units) {
        for (const top of u.topics) {
          if (top.slug === slug) {
            const topicFile = join(ROOT, `content/topics/${slug}.json`);
            let fileData: { summary?: string } = {};
            if (existsSync(topicFile)) {
              try {
                fileData = JSON.parse(readFileSync(topicFile, "utf8"));
              } catch {}
            }
            const objectives = (top.objectives ?? []).map((code) => ({
              id: code,
              code,
              description: loMap.get(code) ?? `Objective ${code}`,
              paper: false,
            }));

            // Map paper sections
            const examPlacements: { paper: number; paperTitle: string; group: string | null; sectionCode: string | null; section: string }[] = [];
            for (const p of spec.papers) {
              for (const gr of p.groups) {
                for (const sec of gr.sections) {
                  if (sec.objectives.some((so) => top.objectives?.includes(so.code))) {
                    examPlacements.push({
                      paper: p.number,
                      paperTitle: p.title,
                      group: gr.title,
                      sectionCode: sec.code,
                      section: sec.title,
                    });
                  }
                }
              }
            }

            return {
              id: top.slug,
              slug: top.slug,
              title: top.title,
              description: fileData.summary ?? null,
              recommended_minutes: (top.hours ?? 2) * 45,
              status: "published",
              objectives,
              examOnly: false,
              curriculumVersionId: "nis-cs-2026-2027",
              school: [
                {
                  grade: g.number,
                  term: t.title,
                  termNumber: t.number,
                  unitCode: u.code,
                  unitTitle: u.title,
                  lessons: top.lessons ?? null,
                  period: top.period ?? null,
                  resources: top.resources ?? null,
                },
              ],
              exam: examPlacements,
            };
          }
        }
      }
    }
  }

  // Check exam only topics
  if (curr.exam_only_topics) {
    for (const e of curr.exam_only_topics) {
      if (e.slug === slug) {
        return {
          id: e.slug,
          slug: e.slug,
          title: e.title,
          description: null,
          recommended_minutes: 90,
          status: "published",
          objectives: e.objectives.map((code) => ({
            id: code,
            code,
            description: loMap.get(code) ?? `Objective ${code}`,
            paper: true,
          })),
          examOnly: true,
          curriculumVersionId: "nis-cs-2026-2027",
          school: [],
          exam: e.placements.map((pl) => ({
            paper: pl.paper,
            paperTitle: `Paper ${pl.paper}`,
            group: null,
            sectionCode: null,
            section: pl.section,
          })),
        };
      }
    }
  }

  return null;
}

export function getLocalTheoryPack(slug: string) {
  const file = join(ROOT, `content/topics/${slug}.json`);
  if (!existsSync(file)) return null;
  try {
    const raw = JSON.parse(readFileSync(file, "utf8"));
    if (!raw.theory || !Array.isArray(raw.theory) || raw.theory.length === 0) return null;
    return {
      id: `pack-${slug}`,
      title: raw.title ?? slug,
      summary: raw.summary ?? null,
      status: "published",
      theory_sections: raw.theory.map((s: { title: string; blocks: unknown; objectives?: string[] }, i: number) => ({
        id: `s-${i}`,
        title: s.title,
        blocks: s.blocks,
        sort_order: i,
        theory_section_objectives: (s.objectives ?? []).map((code: string) => ({
          learning_objectives: { code, curriculum_version_id: "nis-cs-2026-2027" },
        })),
      })),
    };
  } catch {
    return null;
  }
}

export function getLocalQuestions(slug: string): PracticeQuestion[] {
  const file = join(ROOT, `content/topics/${slug}.json`);
  if (!existsSync(file)) return [];
  try {
    const raw = JSON.parse(readFileSync(file, "utf8"));
    if (!raw.questions || !Array.isArray(raw.questions)) return [];
    // Untyped JSON from content/topics; the shape is validated by seed:build.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return raw.questions.map((q: any, i: number) => ({
      id: q.key ?? `q-${i}`,
      title: q.title ?? `Question ${i + 1}`,
      question_text: q.text ?? "",
      question_type: q.type ?? "mcq",
      marks: q.marks ?? 1,
      difficulty: q.difficulty ?? "medium",
      command_word: q.command_word ?? null,
      grading_method: q.grading ?? "AUTO",
      content: q.content ?? {},
      part_label: null,
      group_stem: null,
      group_title: null,
      options: (q.options ?? []).map((opt: { key: string; content: unknown }) => ({ key: opt.key, content: opt.content })),
      objectives: q.objectives ?? [],
    }));
  } catch {
    return [];
  }
}

export function getLocalProgressContext(): ProgressContext {
  const curr = getLocalCurriculum();
  const spec = getLocalExamSpec();
  const los: ProgressLO[] = [];
  const loMap = new Map<string, ProgressLO>();

  // Add objectives from curriculum and papers
  if (curr.objectives) {
    for (const o of curr.objectives) {
      const gNum = Number(o.code.split(".")[0]) || 11;
      const lo: ProgressLO = {
        id: o.code,
        code: o.code,
        description: o.description,
        grade: gNum,
        papers: [],
        topicIds: [],
        source: "ktp",
      };
      los.push(lo);
      loMap.set(o.code, lo);
    }
  }

  for (const p of spec.papers) {
    for (const g of p.groups) {
      for (const s of g.sections) {
        for (const o of s.objectives) {
          let lo = loMap.get(o.code);
          if (!lo) {
            const gNum = Number(o.code.split(".")[0]) || 11;
            lo = {
              id: o.code,
              code: o.code,
              description: o.description,
              grade: gNum,
              papers: [p.number],
              topicIds: [],
              source: "paper",
            };
            los.push(lo);
            loMap.set(o.code, lo);
          } else {
            if (!lo.papers.includes(p.number)) lo.papers.push(p.number);
          }
        }
      }
    }
  }

  const topics: ProgressTopic[] = [];
  let sortOrder = 0;
  for (const g of curr.grades) {
    for (const t of g.terms) {
      for (const u of t.units) {
        for (const top of u.topics) {
          sortOrder++;
          const loIds = top.objectives ?? [];
          for (const id of loIds) {
            loMap.get(id)?.topicIds.push(top.slug);
          }
          const papers = [...new Set(loIds.flatMap((id) => loMap.get(id)?.papers ?? []))].sort();
          topics.push({
            id: top.slug,
            slug: top.slug,
            title: top.title,
            grade: g.number,
            termNumber: t.number,
            termTitle: t.title,
            unitCode: u.code,
            unitTitle: u.title,
            papers,
            loIds,
            sort: sortOrder,
            examOnly: false,
          });
        }
      }
    }
  }

  if (curr.exam_only_topics) {
    for (const e of curr.exam_only_topics) {
      sortOrder++;
      const loIds = e.objectives ?? [];
      const papers = [...new Set(e.placements.map((p) => p.paper))].sort();
      topics.push({
        id: e.slug,
        slug: e.slug,
        title: e.title,
        grade: 12,
        termNumber: 0,
        termTitle: "Exam only",
        unitCode: "Paper",
        unitTitle: "Paper 1-2-3 specification",
        papers,
        loIds,
        sort: sortOrder,
        examOnly: true,
      });
    }
  }

  return { topics, los, loById: loMap };
}
