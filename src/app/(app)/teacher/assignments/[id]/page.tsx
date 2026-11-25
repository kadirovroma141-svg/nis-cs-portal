import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Download } from "@/components/icons";
import { requireProfile, displayName } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAttempts } from "@/lib/teacher-data";
import { INTEGRITY_LABEL } from "@/lib/exams";
import { formatDate, formatPercent, nowMs } from "@/lib/format";
import {
  OVERALL_STATE, PART_LABEL, PART_STATE, overallPercent, overallState, partDeadline, topicParts,
  type OverallState, type TopicProgressRow,
} from "@/lib/topic-assignments";
import type { Assignment, Profile } from "@/lib/db-types";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import { Table, Td, Th } from "@/components/ui/table";
import Link from "next/link";
import { AssignmentDeadlinesForm } from "@/components/teacher/assignment-deadlines-form";
import { ButtonLink } from "@/components/ui/button";
import { ConfirmButton } from "@/components/action-form";
import { LiveMonitor, type MonitorAttempt } from "@/components/teacher/live-monitor";
import { archiveAssignment } from "../../actions";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Assignment") };
}

export default async function AssignmentPage({ params }: PageProps<"/teacher/assignments/[id]">) {
  const tx = await getT();
  await requireProfile(["teacher", "admin"]);
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("assignments")
    .select("*, exams(id, title, current_version_id, exam_versions!exam_versions_exam_id_fkey(id, question_count, total_marks)), topics(title, slug), assignment_targets(class_id, student_id, classes(name))")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const a = data as Assignment & {
    exams: { id: string; title: string; current_version_id: string | null; exam_versions: { id: string; question_count: number }[] } | null;
    topics: { title: string; slug: string } | null;
    assignment_targets: { class_id: string | null; student_id: string | null; classes: { name: string } | null }[];
  };

  // Resolve targeted students.
  const classIds = a.assignment_targets.map((t) => t.class_id).filter((x): x is string => !!x);
  const directIds = a.assignment_targets.map((t) => t.student_id).filter((x): x is string => !!x);
  const isTopic = a.assignment_type === "topic";
  const loadStudents = async () => {
    const { data: members } = classIds.length
      ? await supabase.from("class_members").select("student_id").in("class_id", classIds).eq("status", "active")
      : { data: [] };
    const ids = [...new Set([...(members ?? []).map((m: { student_id: string }) => m.student_id), ...directIds])];
    const { data: profiles } = ids.length ? await supabase.from("profiles").select("id, first_name, last_name, username").in("id", ids) : { data: [] };
    return ((profiles ?? []) as Pick<Profile, "id" | "first_name" | "last_name" | "username">[]).map((p) => ({ id: p.id, name: displayName(p) }));
  };
  // Roster, attempts and topic progress are independent: fetch them in parallel.
  const [students, attempts, { data: progressRows }] = await Promise.all([
    loadStudents(),
    a.exam_id ? getAttempts(supabase, { assignmentId: a.id, limit: 1000 }) : [],
    isTopic ? supabase.rpc("topic_assignment_progress", { p_assignment_id: a.id }) : { data: null },
  ]);

  const latest = new Map<string, (typeof attempts)[number]>();
  for (const at of attempts) if (!latest.has(at.student_id)) latest.set(at.student_id, at);
  const count = (pred: (s: string) => boolean) => students.filter((s) => pred(s.id)).length;
  const statusOf = (sid: string) => latest.get(sid)?.status;
  const qCount = a.exams?.exam_versions.find((v) => v.id === a.exams?.current_version_id)?.question_count ?? 0;

  // Topic assignment: theory + practice + exam progress of every student.
  const progressBy = new Map(((progressRows ?? []) as TopicProgressRow[]).map((r) => [r.student_id, r]));
  const now = nowMs();
  const ORDER: OverallState[] = ["overdue", "not_started", "in_progress", "completed_late", "completed"];
  const board = isTopic
    ? students
        .map((st) => {
          const row = progressBy.get(st.id);
          const parts = topicParts(a, row, now);
          return { st, row, parts, overall: overallState(parts), percent: overallPercent(parts) };
        })
        .sort((x, y) => ORDER.indexOf(x.overall) - ORDER.indexOf(y.overall) || x.st.name.localeCompare(y.st.name))
    : [];
  const tally = (s: OverallState[]) => board.filter((b) => s.includes(b.overall)).length;
  const sample = topicParts(a, progressRows?.[0] as TopicProgressRow | undefined, now);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Assignments", href: "/teacher/assignments" }, { label: a.title }]}
        title={a.title}
        description={[
          a.exams?.title ?? a.topics?.title,
          a.assignment_targets.map((t) => t.classes?.name).filter(Boolean).join(", "),
          a.deadline ? `Due ${formatDate(a.deadline, undefined, tx)}` : "No deadline",
          a.exam_id && !isTopic ? INTEGRITY_LABEL[a.integrity_mode] : null,
        ].filter(Boolean).join(" · ")}
        actions={
          <>
            {a.exam_id && (
              <ButtonLink href={`/api/export?kind=exam&examId=${a.exam_id}&assignmentId=${a.id}&format=xlsx`} variant="secondary" prefetch={false}>
                <Download className="h-4 w-4" />{" "}{tx("Export results")}
              </ButtonLink>
            )}
            <ConfirmButton action={archiveAssignment} fields={{ assignment_id: a.id }} label={tx("Archive")} confirm={tx("Archive this assignment? Results are kept.")} size="md" />
          </>
        }
      />
      {isTopic && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label={tx("Completed")} value={tally(["completed", "completed_late"])} sub={tx("of {length} students{v1}", { length: board.length, v1: tally(["completed_late"]) ? tx(" · {n} late", { n: tally(["completed_late"]) }) : "" })} />
            <Stat label={tx("In progress")} value={tally(["in_progress"])} />
            <Stat label={tx("Not started")} value={tally(["not_started"])} />
            <Stat label={tx("Overdue")} value={tally(["overdue"])} sub={tx("Missed a deadline")} />
          </div>

          <Card className="mt-6">
            <CardHeader
              title={tx("What the students have to do")}
              description={a.instructions ?? undefined}
              action={a.topics && <Link href={`/learn/${a.topics.slug}`} className="text-sm font-medium text-primary hover:underline">{tx("Open the topic")}</Link>}
            />
            <CardBody>
              <ol className="grid gap-3 sm:grid-cols-3">
                {sample.map((p, i) => (
                  <li key={p.key} className="rounded-lg border border-border p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">{tx("Step")}{" "}{i + 1}</p>
                    <p className="font-semibold">{tx(PART_LABEL[p.key])}</p>
                    <p className="mt-1 text-sm text-muted">
                      {p.state === "none"
                        ? tx("{detail} for this topic — not required.", { detail: p.detail })
                        : p.key === "theory"
                          ? tx("Read all {v0} sections of the theory pack.", { v0: progressRows?.[0]?.theory_total ?? "" })
                          : p.key === "practice"
                            ? tx("Answer and check {v0} of {v1} practice questions ({practice_target}%).", { v0: progressRows?.[0]?.practice_needed ?? "", v1: progressRows?.[0]?.practice_total ?? "", practice_target: a.practice_target })
                            : tx("Sit “{title}” in Exam Mode.", { title: a.exams?.title })}
                    </p>
                    {p.state !== "none" && <p className="mt-2 text-sm font-medium">{tx("Due")}{" "}{formatDate(partDeadline(a, p.key), undefined, tx)}</p>}
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>

          <Card className="mt-6">
            <CardHeader title={tx("Progress by student")} description={tx("Theory = sections opened. Practice = questions answered and checked, out of the number required. Students who need attention are listed first.")} />
            <CardBody className="p-0">
              <Table>
                <thead><tr><Th>{tx("Student")}</Th><Th>{tx("Status")}</Th><Th>{tx("Theory")}</Th><Th>{tx("Practice")}</Th><Th>{tx("Exam Mode")}</Th><Th className="w-40">{tx("Overall")}</Th></tr></thead>
                <tbody>
                  {board.map(({ st, row, parts, overall, percent }) => (
                    <tr key={st.id}>
                      <Td className="whitespace-nowrap"><Link href={`/teacher/students/${st.id}`} className="font-medium hover:underline">{st.name}</Link></Td>
                      <Td><Badge tone={OVERALL_STATE[overall].tone}>{tx(OVERALL_STATE[overall].label)}</Badge></Td>
                      {parts.map((p) => (
                        <Td key={p.key}>
                          {p.state === "none" ? (
                            <span className="text-muted">—</span>
                          ) : (
                            <>
                              <Badge tone={PART_STATE[p.state].tone}>{tx(PART_STATE[p.state].label)}</Badge>
                              <p className="mt-1 text-xs text-muted">
                                {p.key === "exam" && row?.exam_attempt_id && row.exam_status !== "IN_PROGRESS" ? (
                                  <Link href={`/teacher/results/${row.exam_attempt_id}`} className="hover:underline">
                                    {row.exam_status === "GRADED" ? formatPercent(row.exam_percentage) : tx("Being marked")}
                                  </Link>
                                ) : (
                                  p.detail
                                )}
                              </p>
                            </>
                          )}
                        </Td>
                      ))}
                      <Td>
                        <div className="flex items-center gap-2">
                          <ProgressBar value={percent} tone={percent >= 100 ? "success" : "primary"} label={tx("{name}: overall progress", { name: st.name })} />
                          <span className="w-9 text-right text-xs tabular-nums">{Math.round(percent)}%</span>
                        </div>
                      </Td>
                    </tr>
                  ))}
                  {board.length === 0 && <tr><Td colSpan={6} className="py-6 text-center text-muted">{tx("No students are assigned.")}</Td></tr>}
                </tbody>
              </Table>
            </CardBody>
          </Card>

          <Card className="mt-6">
            <CardHeader title={tx("Deadlines")} description={tx("Move a deadline to give the class more time. Work already finished keeps its original completion time.")} />
            <CardBody>
              <AssignmentDeadlinesForm assignmentId={a.id} deadline={a.deadline} theoryDeadline={a.theory_deadline} practiceDeadline={a.practice_deadline} hasExam={Boolean(a.exam_id)} />
            </CardBody>
          </Card>
        </>
      )}
      {a.exam_id ? (
        <>
          {!isTopic && <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <Stat label={tx("Not Started")} value={count((s) => !statusOf(s))} />
            <Stat label={tx("In Progress")} value={count((s) => statusOf(s) === "IN_PROGRESS")} />
            <Stat label={tx("Submitted")} value={count((s) => statusOf(s) === "SUBMITTED")} sub={tx("being marked")} />
            <Stat label={tx("Graded")} value={count((s) => statusOf(s) === "GRADED")} />
            <Stat label={tx("Teacher Review Required")} value={count((s) => statusOf(s) === "REVIEW_REQUIRED")} />
          </div>}
          <Card className="mt-6">
            <CardHeader title={tx("Live exam monitoring")} description={isTopic ? tx("Students who started the topic exam from this assignment. Updates in real time.") : tx("Updates in real time while students sit the exam.")} />
            <CardBody className="p-0 pb-2">
              <LiveMonitor
                examId={a.exam_id}
                assignmentId={a.id}
                students={students}
                questionCount={qCount}
                initial={attempts.map((x) => ({
                  id: x.id, student_id: x.student_id, status: x.status, started_at: x.started_at, deadline_at: x.deadline_at,
                  submitted_at: x.submitted_at, current_question: x.current_question, answered_count: x.answered_count,
                  violation_count: x.violation_count, last_heartbeat_at: x.last_heartbeat_at, is_online: x.is_online,
                  percentage: x.percentage, assignment_id: x.assignment_id, technical_issue: x.technical_issue,
                }) satisfies MonitorAttempt)}
              />
            </CardBody>
          </Card>
        </>
      ) : isTopic ? null : (
        <Card>
          <CardBody>
            <p className="text-sm">
              {tx("Practice assignment on")}{" "}<strong>{a.topics?.title}</strong>{" "}{tx("for")}{" "}{students.length}{" "}{tx("students. Track practice in Analytics.")}
            </p>
          </CardBody>
        </Card>
      )}
    </>
  );
}
