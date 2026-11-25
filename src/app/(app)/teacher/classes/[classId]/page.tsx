import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, KeyRound, UserMinus } from "@/components/icons";
import { requireProfile, displayName } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAttempts, getClassRoster, getMasteryByStudent } from "@/lib/teacher-data";
import { getProgressContext, overallMastery, topicProgress, withCompletedTerms } from "@/lib/progress";
import { formatDate, formatPercent, relativeTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import { Field, Input } from "@/components/ui/form";
import { ButtonLink } from "@/components/ui/button";
import { ActionForm, ConfirmButton } from "@/components/action-form";
import { AttemptStatusBadge } from "@/components/attempt-status";
import { addStudentToClass, createStudentInClass, importStudents, removeStudentFromClass, resetStudentPassword } from "../../actions";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Class") };
}

export default async function ClassPage({ params }: PageProps<"/teacher/classes/[classId]">) {
  const tx = await getT();
  await requireProfile(["teacher", "admin"]);
  const { classId } = await params;
  const supabase = await createClient();
  const roster = await getClassRoster(supabase, classId);
  if (!roster) notFound();
  const { cls, students } = roster;
  const ids = students.map((s) => s.id);
  const [ctx, masteryBy, attempts, { data: targets }] = await Promise.all([
    getProgressContext(),
    getMasteryByStudent(supabase, ids),
    getAttempts(supabase, { studentIds: ids, limit: 1000 }),
    supabase.from("assignment_targets").select("assignments(id, title, deadline, assignment_type, archived_at)").eq("class_id", classId),
  ]);

  const graded = attempts.filter((a) => a.status === "GRADED" && a.percentage != null);
  const avgBy = new Map<string, number>();
  for (const s of students) {
    const mine = graded.filter((a) => a.student_id === s.id);
    if (mine.length) avgBy.set(s.id, mine.reduce((t, a) => t + Number(a.percentage), 0) / mine.length);
  }
  // Weak topics: class average of topic mastery among topics someone has attempted.
  const topicAgg = new Map<string, { title: string; slug: string; sum: number; n: number }>();
  for (const s of students) {
    for (const t of topicProgress(ctx, masteryBy.get(s.id) ?? new Map())) {
      if (!t.attempted) continue;
      const a = topicAgg.get(t.id) ?? { title: t.title, slug: t.slug, sum: 0, n: 0 };
      a.sum += t.mastery ?? 0;
      a.n++;
      topicAgg.set(t.id, a);
    }
  }
  const weak = [...topicAgg.values()].map((t) => ({ ...t, avg: t.sum / t.n })).sort((a, b) => a.avg - b.avg).slice(0, 8);
  const assignments = ((targets ?? []) as unknown as { assignments: { id: string; title: string; deadline: string | null; archived_at: string | null } | null }[])
    .map((t) => t.assignments)
    .filter((a): a is NonNullable<typeof a> => !!a && !a.archived_at);
  const sessions = attempts.slice(0, 15);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Classes", href: "/teacher/classes" }, { label: cls.name }]}
        title={tx("Class {name}", { name: cls.name })}
        description={tx("Grade {grade} · {academic_year} · {length} students", { grade: cls.grade, academic_year: cls.academic_year, length: students.length })}
        actions={
          <>
            <ButtonLink href={`/teacher/analytics?class=${cls.id}`} variant="secondary">{tx("Analytics & LO heatmap")}</ButtonLink>
            <ButtonLink href={`/api/export?kind=class&classId=${cls.id}&format=xlsx`} variant="secondary" prefetch={false}>
              <Download className="h-4 w-4" />{" "}{tx("Export")}
            </ButtonLink>
            <ButtonLink href={`/teacher/topics?class=${cls.id}`} variant="secondary">{tx("Topic visibility")}</ButtonLink>
            <ButtonLink href={`/teacher/assignments/new?type=topic&class=${cls.id}`}>{tx("Assign a topic")}</ButtonLink>
            <ButtonLink href={`/teacher/assignments/new?class=${cls.id}`} variant="secondary">{tx("Assign work")}</ButtonLink>
          </>
        }
      />

      <Card>
        <CardHeader title={tx("Students")} />
        <CardBody className="p-0">
          <Table>
            <thead>
              <tr>
                <Th>{tx("Name")}</Th><Th>{tx("Username")}</Th><Th>{tx("Status")}</Th><Th className="w-40">{tx("Progress")}</Th><Th>{tx("Average")}</Th><Th>{tx("Last activity")}</Th><Th className="text-right">{tx("Actions")}</Th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const overall = overallMastery(ctx, withCompletedTerms(ctx, masteryBy.get(s.id) ?? new Map()), s.grade ?? 12);
                return (
                  <tr key={s.id}>
                    <Td><Link href={`/teacher/students/${s.id}`} className="font-medium hover:underline">{displayName(s)}</Link></Td>
                    <Td className="font-mono text-xs">{s.username}</Td>
                    <Td>
                      {!s.is_active ? <Badge tone="danger">{tx("Disabled")}</Badge> : s.force_password_change ? <Badge tone="warning">{tx("Awaiting first login")}</Badge> : <Badge tone="success">{tx("Active")}</Badge>}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <ProgressBar value={overall} label={tx("Overall mastery")} />
                        <span className="w-9 text-right text-xs tabular-nums">{formatPercent(overall)}</span>
                      </div>
                    </Td>
                    <Td className="tabular-nums">{formatPercent(avgBy.get(s.id))}</Td>
                    <Td className="text-muted">{relativeTime(s.last_activity_at, tx)}</Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <ConfirmButton action={resetStudentPassword} fields={{ student_id: s.id }} label={<KeyRound className="h-4 w-4" aria-label={tx("Reset password")} />} variant="ghost" confirm={tx("Reset {username}'s password to the temporary password?", { username: s.username })} />
                        <ConfirmButton action={removeStudentFromClass} fields={{ class_id: cls.id, student_id: s.id }} label={<UserMinus className="h-4 w-4" aria-label={tx("Remove from class")} />} variant="ghost" confirm={tx("Remove {username} from {name}?", { username: s.username, name: cls.name })} />
                      </div>
                    </Td>
                  </tr>
                );
              })}
              {students.length === 0 && <tr><Td colSpan={7} className="py-8 text-center text-muted">{tx("No students yet — add them on the right or import a CSV.")}</Td></tr>}
            </tbody>
          </Table>
        </CardBody>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title={tx("Weak topics")} description={tx("Lowest class average mastery.")} />
          <CardBody className="space-y-3">
            {weak.length === 0 ? <p className="text-sm text-muted">{tx("No activity yet.")}</p> : weak.map((t) => (
              <div key={t.slug} className="space-y-1">
                <div className="flex justify-between gap-2 text-sm"><span className="truncate">{t.title}</span><span className="tabular-nums text-muted">{formatPercent(t.avg)} · {t.n}</span></div>
                <ProgressBar value={t.avg} label={t.title} />
              </div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={tx("Assignments")} action={<Link href="/teacher/assignments" className="text-sm font-medium text-primary hover:underline">{tx("All")}</Link>} />
          <CardBody className="space-y-2">
            {assignments.length === 0 ? <p className="text-sm text-muted">{tx("Nothing assigned to this class.")}</p> : assignments.map((a) => (
              <Link key={a.id} href={`/teacher/assignments/${a.id}`} className="block rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-2">
                <p className="font-medium">{a.title}</p>
                <p className="text-xs text-muted">{a.deadline ? tx("Due {v0}", { v0: formatDate(a.deadline, undefined, tx) }) : tx("No deadline")}</p>
              </Link>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={tx("Add students")} />
          <CardBody className="space-y-6">
            <ActionForm action={addStudentToClass} submitLabel={tx("Add existing student")}>
              <input type="hidden" name="class_id" value={cls.id} />
              <Field label={tx("Username")} htmlFor="add-username"><Input id="add-username" name="username" placeholder={tx("dias.a")} required /></Field>
            </ActionForm>
            <details>
              <summary className="cursor-pointer text-sm font-medium">{tx("Create a new student account")}</summary>
              <div className="mt-3">
                <ActionForm action={createStudentInClass} submitLabel={tx("Create account")}>
                  <input type="hidden" name="class_id" value={cls.id} />
                  <Field label={tx("First name")} htmlFor="fn"><Input id="fn" name="first_name" required /></Field>
                  <Field label={tx("Last name")} htmlFor="ln"><Input id="ln" name="last_name" required /></Field>
                  <Field label={tx("Username")} htmlFor="un" hint={tx("The temporary password must be changed at first login.")}><Input id="un" name="username" required /></Field>
                </ActionForm>
              </div>
            </details>
            <details>
              <summary className="cursor-pointer text-sm font-medium">{tx("Import CSV into this class")}</summary>
              <div className="mt-3">
                <ActionForm action={importStudents} submitLabel={tx("Import")}>
                  <input type="hidden" name="class_id" value={cls.id} />
                  <input type="file" name="file" accept=".csv,text/csv" required className="block w-full text-sm" />
                </ActionForm>
              </div>
            </details>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title={tx("Exam sessions")} description={tx("Most recent attempts by students in this class.")} />
        <CardBody className="p-0">
          <Table>
            <thead><tr><Th>{tx("Student")}</Th><Th>{tx("Exam")}</Th><Th>{tx("Started")}</Th><Th>{tx("Status")}</Th><Th>{tx("Violations")}</Th><Th className="text-right">{tx("Score")}</Th></tr></thead>
            <tbody>
              {sessions.map((a) => (
                <tr key={a.id}>
                  <Td>{a.profiles ? displayName(a.profiles) : "—"}</Td>
                  <Td><Link href={`/teacher/results/${a.id}`} className="hover:underline">{a.exams?.title}</Link></Td>
                  <Td className="text-muted">{formatDate(a.started_at, undefined, tx)}</Td>
                  <Td><AttemptStatusBadge status={a.status} /></Td>
                  <Td>{a.violation_count ? <Badge tone="danger">{a.violation_count}</Badge> : "0"}</Td>
                  <Td className="text-right tabular-nums">{formatPercent(a.percentage)}</Td>
                </tr>
              ))}
              {sessions.length === 0 && <tr><Td colSpan={6} className="py-6 text-center text-muted">{tx("No exam attempts yet.")}</Td></tr>}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    </>
  );
}
