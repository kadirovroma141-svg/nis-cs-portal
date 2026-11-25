import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile, displayName } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMasteryByStudent, getVisibleStudents } from "@/lib/teacher-data";
import { getProgressContext, overallMastery, withCompletedTerms } from "@/lib/progress";
import { formatPercent, relativeTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { Input } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Students") };
}

export default async function StudentsPage({ searchParams }: PageProps<"/teacher/students">) {
  const t = await getT();
  await requireProfile(["teacher", "admin"]);
  const q = String((await searchParams).q ?? "").trim().toLowerCase();
  const supabase = await createClient();
  const all = await getVisibleStudents(supabase);
  const students = q ? all.filter((s) => `${s.first_name} ${s.last_name} ${s.username}`.toLowerCase().includes(q)) : all;
  const [ctx, mastery, { data: memberships }] = await Promise.all([
    getProgressContext(),
    getMasteryByStudent(supabase, students.map((s) => s.id)),
    supabase.from("class_members").select("student_id, classes(name)").eq("status", "active"),
  ]);
  const classOf = new Map<string, string[]>();
  for (const m of (memberships ?? []) as unknown as { student_id: string; classes: { name: string } | null }[]) {
    if (m.classes) classOf.set(m.student_id, [...(classOf.get(m.student_id) ?? []), m.classes.name]);
  }
  return (
    <>
      <PageHeader title={t("Students")} description={t("{length} students in your classes", { length: all.length })} />
      <Card>
        <CardBody>
          <form className="max-w-sm"><Input name="q" defaultValue={q} placeholder={t("Search by name or username")} aria-label={t("Search students")} /></form>
        </CardBody>
        <CardBody className="p-0">
          <Table>
            <thead><tr><Th>{t("Name")}</Th><Th>{t("Username")}</Th><Th>{t("Class")}</Th><Th>{t("Grade")}</Th><Th className="w-40">{t("Overall")}</Th><Th>{t("Last activity")}</Th></tr></thead>
            <tbody>
              {students.map((s) => {
                const o = overallMastery(ctx, withCompletedTerms(ctx, mastery.get(s.id) ?? new Map()), s.grade ?? 12);
                return (
                  <tr key={s.id}>
                    <Td>
                      <Link href={`/teacher/students/${s.id}`} className="font-medium hover:underline">{displayName(s)}</Link>
                      {!s.is_active && <Badge tone="danger" className="ml-2">{t("Disabled")}</Badge>}
                    </Td>
                    <Td className="font-mono text-xs">{s.username}</Td>
                    <Td>{(classOf.get(s.id) ?? []).join(", ") || "—"}</Td>
                    <Td>{s.grade ?? "—"}</Td>
                    <Td><div className="flex items-center gap-2"><ProgressBar value={o} label={t("Overall")} /><span className="w-9 text-right text-xs tabular-nums">{formatPercent(o)}</span></div></Td>
                    <Td className="text-muted">{relativeTime(s.last_activity_at, t)}</Td>
                  </tr>
                );
              })}
              {students.length === 0 && <tr><Td colSpan={6} className="py-6 text-center text-muted">{t("No students found.")}</Td></tr>}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    </>
  );
}
