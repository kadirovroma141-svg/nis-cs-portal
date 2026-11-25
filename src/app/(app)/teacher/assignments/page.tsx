import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, nowMs } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Assignments") };
}

const TYPE_LABEL = { topic: "Topic", practice: "Practice", topic_exam: "Topic Exam", mock_exam: "Mock Exam", revision: "Revision" } as const;

export default async function AssignmentsPage() {
  const tx = await getT();
  const profile = await requireProfile(["teacher", "admin"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("assignments")
    .select("id, title, assignment_type, available_from, deadline, created_at, assignment_targets(classes(name), profiles(username)), attempts(status)")
    .eq("teacher_id", profile.id)
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  type Row = {
    id: string;
    title: string;
    assignment_type: keyof typeof TYPE_LABEL;
    available_from: string;
    deadline: string | null;
    assignment_targets: { classes: { name: string } | null; profiles: { username: string } | null }[];
    attempts: { status: string }[];
  };
  const rows = (data ?? []) as unknown as Row[];
  return (
    <>
      <PageHeader
        title={tx("Assignments")}
        description={tx("Assign a whole topic (theory, practice and exam) to a class with deadlines, or set a single exam or practice task.")}
        actions={
          <>
            <ButtonLink href="/teacher/assignments/new?type=topic">{tx("Assign a topic")}</ButtonLink>
            <ButtonLink href="/teacher/assignments/new" variant="secondary">{tx("Other assignment")}</ButtonLink>
          </>
        }
      />
      {rows.length === 0 ? (
        <EmptyState title={tx("No assignments yet")} action={<ButtonLink href="/teacher/assignments/new?type=topic">{tx("Assign a topic")}</ButtonLink>} />
      ) : (
        <Card>
          <CardBody className="p-0">
            <Table>
              <thead><tr><Th>{tx("Assignment")}</Th><Th>{tx("Type")}</Th><Th>{tx("Assigned to")}</Th><Th>{tx("Opens")}</Th><Th>{tx("Deadline")}</Th><Th>{tx("Attempts")}</Th></tr></thead>
              <tbody>
                {rows.map((a) => {
                  const overdue = a.deadline && new Date(a.deadline).getTime() < nowMs();
                  return (
                    <tr key={a.id}>
                      <Td><Link href={`/teacher/assignments/${a.id}`} className="font-medium hover:underline">{a.title}</Link></Td>
                      <Td><Badge tone={a.assignment_type === "topic" ? "primary" : "neutral"}>{tx(TYPE_LABEL[a.assignment_type])}</Badge></Td>
                      <Td className="text-sm">{a.assignment_targets.map((t) => t.classes?.name ?? t.profiles?.username).filter(Boolean).join(", ")}</Td>
                      <Td className="text-muted">{formatDate(a.available_from, undefined, tx)}</Td>
                      <Td>{a.deadline ? <span className={overdue ? "text-muted" : ""}>{formatDate(a.deadline, undefined, tx)}</span> : "—"}</Td>
                      <Td className="tabular-nums">
                        {a.attempts.length}
                        {a.attempts.some((x) => x.status === "IN_PROGRESS") && <Badge tone="info" className="ml-2">{tx("live")}</Badge>}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </CardBody>
        </Card>
      )}
    </>
  );
}
