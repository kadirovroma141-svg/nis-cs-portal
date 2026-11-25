import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { QUESTION_TYPE_LABELS } from "@/lib/questions/types";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { ConfirmButton } from "@/components/action-form";
import { archiveQuestion } from "@/app/(app)/teacher/questions/actions";

type Row = {
  id: string;
  title: string;
  question_type: keyof typeof QUESTION_TYPE_LABELS;
  marks: number;
  status: string;
  practice_enabled: boolean;
  difficulty: string;
};

/**
 * Staff view of a topic's questions on the Practice / Exam tabs: add, open in the
 * editor (/teacher/questions/<id>), archive; and the topic exam's question list.
 * Archive instead of delete: practice attempts and exam snapshots keep pointing at the question.
 */
export async function TopicQuestionsPanel({ topicId, mode }: { topicId: string; mode: "practice" | "exam" }) {
  const t = await getT();
  const supabase = await createClient();
  const [{ data: rows }, { data: exams }] = await Promise.all([
    supabase
      .from("questions")
      .select("id, title, question_type, marks, status, practice_enabled, difficulty")
      .eq("topic_id", topicId)
      .is("parent_id", null)
      .is("archived_at", null)
      .eq("practice_enabled", mode === "practice")
      .order("created_at"),
    supabase.from("exams").select("id, title, status, exam_questions(question_id)").eq("topic_id", topicId).eq("kind", "topic").is("archived_at", null),
  ]);
  const list = (rows ?? []) as Row[];
  const topicExams = (exams ?? []) as unknown as { id: string; title: string; status: string; exam_questions: { question_id: string }[] }[];
  const inExam = new Set(topicExams.flatMap((e) => e.exam_questions.map((q) => q.question_id)));
  const newHref = `/teacher/questions/new?topic=${topicId}${mode === "exam" ? "&practice=0" : ""}`;

  return (
    <details className="rounded-lg border-2 border-dashed border-border bg-surface print:hidden" open={list.length === 0}>
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold">
        {mode === "practice" ? t("Вопросы практики — для учителя ({n})", { n: list.length }) : t("Экзаменационные вопросы — для учителя ({n})", { n: list.length })}
      </summary>
      <div className="space-y-3 border-t border-border px-4 py-3">
        <p className="text-xs text-muted">
          {mode === "practice"
            ? t("Ученики видят только опубликованные вопросы. «В архив» убирает вопрос из практики; ответы учеников и экзамены, где он уже был, не меняются.")
            : t("Эти вопросы не показываются в практике. Новый вопрос попадает в экзамен, когда вы добавите его в состав экзамена и опубликуете новую версию; начатые попытки остаются на старой версии.")}
        </p>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={newHref} size="sm">{mode === "practice" ? t("+ Вопрос практики") : t("+ Экзаменационный вопрос")}</ButtonLink>
          {topicExams.map((e) => (
            <ButtonLink key={e.id} href={`/teacher/exams/${e.id}`} variant="secondary" size="sm">
              {t("Состав экзамена: {title}", { title: e.title })}{e.status !== "published" ? ` (${t(e.status)})` : ""}
            </ButtonLink>
          ))}
        </div>
        {list.length > 0 && (
          <ul className="divide-y divide-border">
            {list.map((q) => (
              <li key={q.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <Link href={`/teacher/questions/${q.id}`} className="min-w-0 flex-1 hover:underline">{q.title}</Link>
                <Badge>{t(QUESTION_TYPE_LABELS[q.question_type] ?? q.question_type)}</Badge>
                <Badge>{q.marks} {t("б.")}</Badge>
                {q.status !== "published" && <Badge tone="warning">{t(q.status)}</Badge>}
                {inExam.has(q.id) && <Badge tone="primary">{t("в экзамене")}</Badge>}
                <ButtonLink href={`/teacher/questions/${q.id}`} variant="ghost" size="sm">{t("Изменить")}</ButtonLink>
                <ConfirmButton action={archiveQuestion} fields={{ question_id: q.id }} label={t("В архив")} variant="ghost" size="sm"
                  confirm={t("Убрать вопрос в архив? Он исчезнет из практики и из новых версий экзамена; прошлые ответы учеников сохранятся.")} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
