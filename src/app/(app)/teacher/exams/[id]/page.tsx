import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Copy } from "@/components/icons";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getActiveVersion } from "@/lib/curriculum";
import { getBankItems } from "@/lib/bank";
import { getUnitOptions } from "@/lib/summative";
import { formatDate } from "@/lib/format";
import type { Exam } from "@/lib/db-types";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ActionForm, ConfirmButton } from "@/components/action-form";
import { ExamSettingsForm } from "@/components/teacher/exam-settings-form";
import { ExamQuestionPicker } from "@/components/teacher/exam-question-picker";
import { duplicateExam, publishExam, setExamStatus } from "../actions";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Exam") };
}

export default async function ExamBuilderPage({ params }: PageProps<"/teacher/exams/[id]">) {
  const t = await getT();
  const profile = await requireProfile(["teacher", "admin"]);
  const { id } = await params;
  const supabase = await createClient();
  const version = await getActiveVersion();
  const [{ data: exam }, { data: versions }, { data: items }, { data: topics }, bank, { count: attemptCount }, units] = await Promise.all([
    supabase.from("exams").select("*, paper_components(number)").eq("id", id).maybeSingle(),
    supabase.from("exam_versions").select("*").eq("exam_id", id).order("version", { ascending: false }),
    supabase.from("exam_questions").select("question_id, marks_override, section_label, sort_order").eq("exam_id", id).order("sort_order"),
    supabase.from("topics").select("id, title").eq("curriculum_version_id", version?.id ?? "").order("sort_order"),
    getBankItems(),
    supabase.from("attempts").select("id", { count: "exact", head: true }).eq("exam_id", id),
    getUnitOptions(),
  ]);
  if (!exam) notFound();
  const e = exam as Exam & { paper_components: { number: number } | null };
  // topic exams built by questions:apply have no author: every teacher maintains them
  const canEdit = profile.role === "admin" || e.created_by === profile.id || e.created_by === null;
  const current = (versions ?? []).find((v) => v.id === e.current_version_id);
  const summative = e.kind === "summative";

  return (
    <>
      <PageHeader
        breadcrumbs={[summative ? { label: "Summative Assessments", href: "/teacher/summative" } : { label: "Exam Sessions", href: "/teacher/exams" }, { label: e.title }]}
        title={e.title}
        description={current ? t("Published v{version} · {question_count} questions · {total_marks} marks · {v3} attempts", { version: current.version, question_count: current.question_count, total_marks: current.total_marks, v3: attemptCount ?? 0 }) : t("Not published yet")}
        actions={
          <>
            <Badge tone={e.status === "published" ? "success" : e.status === "draft" ? "neutral" : "warning"}>{t(e.status)}</Badge>
            <ButtonLink href={`/teacher/exams/${e.id}/live`} variant="secondary">{t("Live monitor")}</ButtonLink>
            {summative ? (
              <ButtonLink href={`/teacher/summative?grade=${e.grade ?? 11}`} variant="secondary">{t("Class access")}</ButtonLink>
            ) : (
              e.current_version_id && <ButtonLink href={`/teacher/assignments/new?exam=${e.id}`} variant="secondary">{t("Assign")}</ButtonLink>
            )}
            <ConfirmButton action={duplicateExam} fields={{ exam_id: e.id }} label={<><Copy className="h-4 w-4" />{" "}{t("Duplicate")}</>} size="md" />
          </>
        }
      />
      {!canEdit && <Alert tone="info" className="mb-6">{t("This exam was created by someone else. Duplicate it to make an editable copy.")}</Alert>}
      {summative && (
        <Alert tone="info" className="mb-6">
          {e.variant_of ? (
            <>{t("This is")}{" "}<strong>{t("Variant")}{" "}{e.variant_no}</strong>{" "}{t("of a summative assessment. Keep the same structure and marks and change only the numbers and contexts. Once published, each student of a class is given one variant at random.")}{" "}</>
          ) : null}
          {t("A published summative assessment stays hidden from students until you open it for a class on the Summative Assessments page.")}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={t("Settings")} />
          <CardBody>
            <ExamSettingsForm exam={e} topics={topics ?? []} units={units} paperNumber={e.paper_components?.number} readOnly={!canEdit} />
          </CardBody>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title={t("Publish")} description={t("Publishing freezes the current questions and mark schemes into a new immutable version.")} />
            <CardBody className="space-y-3">
              {(attemptCount ?? 0) > 0 && (
                <p className="text-sm text-muted">{t("Students have already sat this exam. Publishing creates a new version; their results stay linked to the version they took.")}</p>
              )}
              {canEdit && (
                <ActionForm action={publishExam} submitLabel={current ? t("Publish new version") : t("Publish")} pendingLabel={t("Publishing…")} submitVariant="success">
                  <input type="hidden" name="exam_id" value={e.id} />
                </ActionForm>
              )}
              {canEdit && e.status !== "draft" && (
                <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                  {e.status !== "closed" && <ConfirmButton action={setExamStatus} fields={{ exam_id: e.id, status: "closed" }} label={t("Close")} confirm={t("Close this exam? Students can no longer start it.")} />}
                  {e.status === "closed" && <ConfirmButton action={setExamStatus} fields={{ exam_id: e.id, status: "published" }} label={t("Reopen")} />}
                  <ConfirmButton action={setExamStatus} fields={{ exam_id: e.id, status: "archived" }} label={t("Archive")} variant="danger" confirm={t("Archive this exam? Existing results are kept.")} />
                </div>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t("Versions")} />
            <CardBody>
              {(versions ?? []).length === 0 ? (
                <p className="text-sm text-muted">{t("No published versions.")}</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {(versions ?? []).map((v) => (
                    <li key={v.id} className="flex items-center justify-between">
                      <span>{t("Version")}{" "}{v.version} {v.id === e.current_version_id && <Badge tone="success" className="ml-1">{t("current")}</Badge>}</span>
                      <span className="text-xs text-muted">{v.question_count} q · {v.total_marks}{" "}{t("marks ·")}{" "}{formatDate(v.published_at, false, t)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader title={t("Questions")} description={t("Edits here change the draft only. Publish to release them.")} />
        <CardBody>
          <ExamQuestionPicker examId={e.id} bank={bank} readOnly={!canEdit} initial={(items ?? []).map((i) => ({ question_id: i.question_id, marks_override: i.marks_override, section_label: i.section_label }))} />
        </CardBody>
      </Card>
    </>
  );
}
