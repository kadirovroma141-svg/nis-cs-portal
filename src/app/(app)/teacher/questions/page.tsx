import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getActiveVersion } from "@/lib/curriculum";
import { DIFFICULTIES, DIFFICULTY_LABELS, QUESTION_TYPES, QUESTION_TYPE_LABELS, CONTENT_STATUSES, type QuestionType, type Difficulty } from "@/lib/questions/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { Badge, type Tone } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/form";
import { Button, ButtonLink } from "@/components/ui/button";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Question Bank") };
}

const STATUS_TONE: Record<string, Tone> = { draft: "neutral", review: "warning", published: "success", archived: "neutral" };

export default async function QuestionBankPage({ searchParams }: PageProps<"/teacher/questions">) {
  const tx = await getT();
  await requireProfile(["teacher", "admin"]);
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const f = { q: get("q"), topic: get("topic"), type: get("type"), difficulty: get("difficulty"), status: get("status"), paper: get("paper"), source: get("source") };
  const supabase = await createClient();
  const topicsPromise = getActiveVersion().then((version) =>
    supabase.from("topics").select("id, title").eq("curriculum_version_id", version?.id ?? "").order("sort_order"),
  );

  let query = supabase
    .from("questions")
    .select("id, title, question_type, marks, difficulty, command_word, grading_method, status, practice_enabled, source_type, updated_at, topics(title), paper_components!inner(number), parts:questions!questions_parent_id_fkey(count)", { count: "exact" })
    .order("updated_at", { ascending: false })
    .limit(300);
  if (!f.paper) query = supabase
    .from("questions")
    .select("id, title, question_type, marks, difficulty, command_word, grading_method, status, practice_enabled, source_type, updated_at, topics(title), paper_components(number), parts:questions!questions_parent_id_fkey(count)", { count: "exact" })
    .order("updated_at", { ascending: false })
    .limit(300);
  else query = query.eq("paper_components.number", Number(f.paper));
  query = query.is("parent_id", null); // parts are listed on their structured question
  if (f.q) query = query.ilike("title", `%${f.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
  if (f.topic) query = query.eq("topic_id", f.topic);
  if (f.type) query = query.eq("question_type", f.type);
  if (f.difficulty) query = query.eq("difficulty", f.difficulty);
  if (f.status) query = query.eq("status", f.status);
  else query = query.neq("status", "archived");
  if (f.source) query = query.eq("source_type", f.source);
  // The topic filter list and the question list do not depend on each other.
  const [{ data: topics }, { data, count }] = await Promise.all([topicsPromise, query]);
  type Row = {
    id: string; title: string; question_type: QuestionType; marks: number; difficulty: Difficulty; grading_method: string;
    status: string; practice_enabled: boolean; source_type: string; topics: { title: string } | null; paper_components: { number: number } | null;
    parts: { count: number }[];
  };
  const rows = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageHeader title={tx("Question Bank")} description={tx("{v0} questions", { v0: count ?? rows.length })} actions={<ButtonLink href="/teacher/questions/new">{tx("New question")}</ButtonLink>} />
      <Card>
        <CardBody>
          <form className="grid gap-2 sm:grid-cols-4 lg:grid-cols-8">
            <Input name="q" defaultValue={f.q} placeholder={tx("Search title")} aria-label={tx("Search")} className="lg:col-span-2" />
            <Select name="topic" defaultValue={f.topic} aria-label={tx("Topic")}>
              <option value="">{tx("All topics")}</option>
              {((topics ?? []) as { id: string; title: string }[]).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </Select>
            <Select name="paper" defaultValue={f.paper} aria-label={tx("Paper")}>
              <option value="">{tx("All papers")}</option><option value="1">{tx("Paper 1")}</option><option value="2">{tx("Paper 2")}</option><option value="3">{tx("Paper 3")}</option>
            </Select>
            <Select name="type" defaultValue={f.type} aria-label={tx("Type")}>
              <option value="">{tx("All types")}</option>
              {QUESTION_TYPES.map((t) => <option key={t} value={t}>{tx(QUESTION_TYPE_LABELS[t])}</option>)}
            </Select>
            <Select name="difficulty" defaultValue={f.difficulty} aria-label={tx("Difficulty")}>
              <option value="">{tx("Any difficulty")}</option>
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{tx(DIFFICULTY_LABELS[d])}</option>)}
            </Select>
            <Select name="status" defaultValue={f.status} aria-label={tx("Status")}>
              <option value="">{tx("Not archived")}</option>
              {CONTENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Button type="submit">{tx("Filter")}</Button>
          </form>
        </CardBody>
        <CardBody className="p-0">
          <Table>
            <thead><tr><Th>{tx("Question")}</Th><Th>{tx("Type")}</Th><Th>{tx("Marks")}</Th><Th>{tx("Difficulty")}</Th><Th>{tx("Marking")}</Th><Th>{tx("Paper")}</Th><Th>{tx("Status")}</Th></tr></thead>
            <tbody>
              {rows.map((q) => (
                <tr key={q.id}>
                  <Td>
                    <Link href={`/teacher/questions/${q.id}`} className="font-medium hover:underline">{q.title}</Link>
                    <p className="text-xs text-muted">{q.topics?.title ?? tx("No topic")}{!q.practice_enabled && tx(" · exam-only")}{q.source_type === "mock" && tx(" · mock")}{q.question_type === "structured" && tx(" · {v0} parts", { v0: q.parts?.[0]?.count ?? 0 })}</p>
                  </Td>
                  <Td className="text-xs">{tx(QUESTION_TYPE_LABELS[q.question_type])}</Td>
                  <Td className="tabular-nums">{q.marks}</Td>
                  <Td className="text-xs">{tx(DIFFICULTY_LABELS[q.difficulty])}</Td>
                  <Td><Badge tone={q.grading_method === "AI" ? "info" : q.grading_method === "AUTO" ? "primary" : "neutral"}>{q.grading_method}</Badge></Td>
                  <Td className="text-xs">{q.paper_components ? `P${q.paper_components.number}` : "—"}</Td>
                  <Td><Badge tone={STATUS_TONE[q.status]}>{tx(q.status)}</Badge></Td>
                </tr>
              ))}
              {rows.length === 0 && <tr><Td colSpan={7} className="py-8 text-center text-muted">{tx("No questions match these filters.")}</Td></tr>}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    </>
  );
}
