import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "@/components/icons";
import { requireProfile, displayName } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAttempts, getClassRoster, getExamGroup, getTeacherClasses, getVisibleStudents, stats } from "@/lib/teacher-data";
import { formatDate, formatPercent } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/form";
import { Button, ButtonLink } from "@/components/ui/button";
import { AttemptStatusBadge } from "@/components/attempt-status";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Results") };
}

export default async function ResultsPage({ searchParams }: PageProps<"/teacher/results">) {
  const t = await getT();
  const profile = await requireProfile(["teacher", "admin"]);
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const f = { exam: get("exam"), cls: get("class"), status: get("status") };
  const supabase = await createClient();
  // Independent lookups run in parallel; attempts and the queue depend on them.
  const [classes, students, group, { data: examData }] = await Promise.all([
    getTeacherClasses(supabase, profile),
    f.cls ? getClassRoster(supabase, f.cls).then((r) => r?.students ?? []) : getVisibleStudents(supabase),
    // A summative with variants is shown as one assessment: all its variants together.
    f.exam ? getExamGroup(supabase, f.exam) : null,
    supabase.from("exams").select("id, title, variant_of").not("current_version_id", "is", null).order("title"),
  ]);
  const variantNo = new Map((group?.variants ?? []).map((v) => [v.id, v.no]));
  const many = variantNo.size > 1;
  const attempts = await getAttempts(supabase, {
    studentIds: students.map((s) => s.id),
    examIds: group ? group.variants.map((v) => v.id) : undefined,
    status: f.status ? [f.status] : ["SUBMITTED", "GRADED", "REVIEW_REQUIRED"],
    limit: 1000,
  });
  const examRows = (examData ?? []) as { id: string; title: string; variant_of: string | null }[];
  // Variants are reached through their base exam.
  const hasVariants = new Set((examRows ?? []).map((e) => e.variant_of as string | null).filter(Boolean));
  const exams = (examRows ?? []).filter((e) => !e.variant_of || !(examRows ?? []).some((b) => b.id === e.variant_of));
  const perVariant = many
    ? group!.variants.map((v) => {
        const own = attempts.filter((a) => a.exam_id === v.id);
        return { ...v, sat: new Set(own.map((a) => a.student_id)).size, s: stats(own.filter((a) => a.status === "GRADED" && a.percentage != null).map((a) => Number(a.percentage))) };
      })
    : [];
  const overall = stats(attempts.filter((a) => a.status === "GRADED" && a.percentage != null).map((a) => Number(a.percentage)));
  const { data: queue } = await supabase
    .from("grading_results")
    .select("id, attempt_id, question_id, awarded_mark, max_mark, confidence, error")
    .eq("needs_review", true)
    .in("attempt_id", attempts.map((a) => a.id).concat("00000000-0000-0000-0000-000000000000"))
    .limit(500);
  const queueByAttempt = new Map<string, number>();
  for (const r of queue ?? []) queueByAttempt.set(r.attempt_id, (queueByAttempt.get(r.attempt_id) ?? 0) + 1);
  const exportHref = `/api/export?kind=exam&format=xlsx${group ? `&examId=${group.baseId}` : ""}${f.cls ? `&classId=${f.cls}` : ""}`;

  return (
    <>
      <PageHeader
        title={t("Results")}
        description={t("Submitted attempts by your students. Open an attempt to moderate AI marks.")}
        actions={<ButtonLink href={exportHref} variant="secondary" prefetch={false}><Download className="h-4 w-4" />{" "}{t("Export")}</ButtonLink>}
      />
      {(queue ?? []).length > 0 && (
        <Card className="mb-6 border-warning/40">
          <CardHeader title={t("Moderation queue — {length} answer(s)", { length: (queue ?? []).length })} description={t("Low AI confidence, manual questions or marking errors.")} />
          <CardBody className="flex flex-wrap gap-2">
            {[...queueByAttempt].slice(0, 30).map(([attemptId, n]) => {
              const a = attempts.find((x) => x.id === attemptId);
              return (
                <Link key={attemptId} href={`/teacher/results/${attemptId}`} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-2">
                  <span className="font-medium">{a?.profiles ? displayName(a.profiles) : t("Student")}</span> · {a?.exams?.title} <Badge tone="warning" className="ml-1">{n}</Badge>
                </Link>
              );
            })}
          </CardBody>
        </Card>
      )}
      {many && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label={t("All variants")} value={formatPercent(overall.mean)} sub={t("{size} students · {n} marked", { size: new Set(attempts.map((a) => a.student_id)).size, n: overall.n })} />
          {perVariant.map((v) => (
            <Stat key={v.id} label={t("Variant {no} — average", { no: v.no })} value={formatPercent(v.s.mean)} sub={t("{sat} students · {n} marked", { sat: v.sat, n: v.s.n })} />
          ))}
        </div>
      )}
      <Card>
        <CardBody>
          <form className="grid gap-2 sm:grid-cols-4">
            <Select name="exam" defaultValue={group?.baseId ?? f.exam} aria-label={t("Exam")}>
              <option value="">{t("All exams")}</option>
              {exams.map((e) => <option key={e.id} value={e.id}>{e.title}{hasVariants.has(e.id) ? t(" — all variants") : ""}</option>)}
            </Select>
            <Select name="class" defaultValue={f.cls} aria-label={t("Class")}>
              <option value="">{t("All my classes")}</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select name="status" defaultValue={f.status} aria-label={t("Status")}>
              <option value="">{t("All submitted")}</option>
              <option value="GRADED">{t("Graded")}</option>
              <option value="REVIEW_REQUIRED">{t("Teacher review required")}</option>
              <option value="SUBMITTED">{t("Being marked")}</option>
            </Select>
            <Button type="submit">{t("Filter")}</Button>
          </form>
        </CardBody>
        <CardBody className="p-0">
          <Table>
            <thead><tr><Th>{t("Student")}</Th><Th>{t("Exam")}</Th>{many && <Th>{t("Variant")}</Th>}<Th>{t("Submitted")}</Th><Th>{t("Status")}</Th><Th>{t("Violations")}</Th><Th className="text-right">{t("Score")}</Th></tr></thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a.id}>
                  <Td><Link href={`/teacher/results/${a.id}`} className="font-medium hover:underline">{a.profiles ? displayName(a.profiles) : "—"}</Link></Td>
                  <Td>{a.exams?.title}</Td>
                  {many && <Td><Badge tone="primary">{t("Variant")}{" "}{variantNo.get(a.exam_id) ?? "?"}</Badge></Td>}
                  <Td className="text-muted">{formatDate(a.submitted_at, undefined, t)}</Td>
                  <Td>
                    <AttemptStatusBadge status={a.status} />
                    {queueByAttempt.get(a.id) ? <Badge tone="warning" className="ml-1">{queueByAttempt.get(a.id)}{" "}{t("to review")}</Badge> : null}
                  </Td>
                  <Td>{a.violation_count ? <Badge tone="danger">{a.violation_count}</Badge> : "0"}</Td>
                  <Td className="text-right tabular-nums">{a.score != null ? `${Number(a.score)}/${Number(a.max_score)} · ${formatPercent(a.percentage)}` : "—"}</Td>
                </tr>
              ))}
              {attempts.length === 0 && <tr><Td colSpan={many ? 7 : 6} className="py-8 text-center text-muted">{t("No submitted attempts.")}</Td></tr>}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    </>
  );
}
