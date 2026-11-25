import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { TopicQuestionsPanel } from "@/components/teacher/topic-questions-panel";
import { createClient } from "@/lib/supabase/server";
import { getTopicBySlug } from "@/lib/curriculum";
import { attemptLink } from "@/lib/student-data";
import { formatDate, formatPercent } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AttemptStatusBadge } from "@/components/attempt-status";
import type { Attempt } from "@/lib/db-types";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Exam Mode") };
}

export default async function TopicExamPage({ params }: PageProps<"/learn/[topic]/exam">) {
  const t = await getT();
  const profile = await requireProfile();
  const topic = await getTopicBySlug((await params).topic);
  if (!topic) notFound();
  const supabase = await createClient();
  const { data: exams } = await supabase
    .from("exams")
    .select("id, title, duration_minutes, exam_versions!exam_versions_exam_id_fkey(question_count, total_marks, id)")
    .eq("topic_id", topic.id)
    .eq("kind", "topic")
    .in("status", ["published", "scheduled"])
    .is("archived_at", null);
  const list = (exams ?? []) as unknown as {
    id: string;
    title: string;
    duration_minutes: number;
    exam_versions: { id: string; question_count: number; total_marks: number }[];
  }[];
  const { data: attempts } = await supabase
    .from("attempts")
    .select("id, exam_id, status, percentage, show_results, submitted_at, started_at")
    .eq("student_id", profile.id)
    .in("exam_id", list.map((e) => e.id).concat("00000000-0000-0000-0000-000000000000"))
    .order("created_at", { ascending: false });

  const staffPanel = profile.role === "student" ? null : <TopicQuestionsPanel topicId={topic.id} mode="exam" />;
  if (list.length === 0) {
    return (
      <div className="space-y-6">
        {staffPanel}
        <EmptyState title={t("No topic exam yet")}>{t("Use Practice mode while the topic exam is being prepared.")}</EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {staffPanel}
      {list.map((e) => {
        const v = e.exam_versions.at(-1);
        const mine = (attempts ?? []).filter((a) => a.exam_id === e.id) as Pick<Attempt, "id" | "status" | "percentage" | "show_results" | "submitted_at" | "started_at">[];
        return (
          <Card key={e.id}>
            <CardHeader
              title={e.title}
              description={t("{v0} questions · {v1} marks · {duration_minutes} minutes", { v0: v?.question_count ?? "?", v1: v?.total_marks ?? "?", duration_minutes: e.duration_minutes })}
              action={<ButtonLink href={`/exams/${e.id}`}>{t("Go to exam")}</ButtonLink>}
            />
            <CardBody>
              <p className="mb-3 text-sm text-muted">
                {t("Exam Mode is a timed assessment: no hints or feedback until you submit. Leaving the exam window is recorded.")}
              </p>
              {mine.length > 0 && (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {mine.map((a) => (
                    <li key={a.id}>
                      <Link href={attemptLink(a)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface-2">
                        <span className="flex-1">{formatDate(a.submitted_at ?? a.started_at, undefined, t)}</span>
                        {a.status === "GRADED" && a.show_results ? (
                          <span className="font-semibold tabular-nums">{formatPercent(a.percentage)}</span>
                        ) : (
                          <AttemptStatusBadge status={a.status} />
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
