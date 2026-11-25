"use client";
import { useActionState, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { saveExam, type ExamActionState } from "@/app/(app)/teacher/exams/actions";
import type { Exam } from "@/lib/db-types";
import { useT } from "@/lib/i18n/client";

function toLocal(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

export function ExamSettingsForm({
  exam,
  topics,
  units = [],
  paperNumber,
  readOnly = false,
  defaultKind,
  defaultUnitId,
}: {
  exam?: Exam;
  topics: { id: string; title: string }[];
  /** units of the school programme, for summative assessments */
  units?: { id: string; label: string }[];
  paperNumber?: number | null;
  readOnly?: boolean;
  /** presets for a new exam (e.g. opened from the Summative Assessments page) */
  defaultKind?: Exam["kind"];
  defaultUnitId?: string;
}) {
  const tr = useT();
  const [state, action, pending] = useActionState<ExamActionState, FormData>(saveExam, {});
  const [kind, setKind] = useState(exam?.kind ?? defaultKind ?? "custom");
  const summative = kind === "summative";
  const tz = useMemo(() => new Date().getTimezoneOffset(), []);
  return (
    <form action={action} className="space-y-5">
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.ok && <Alert tone="success">{state.message}</Alert>}
      <input type="hidden" name="tz_offset" value={tz} />
      {exam && <input type="hidden" name="exam_id" value={exam.id} />}
      <fieldset disabled={readOnly} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={tr("Title")} htmlFor="title"><Input id="title" name="title" defaultValue={exam?.title} required /></Field>
          <Field label={tr("Type")} htmlFor="kind">
            <Select id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value as Exam["kind"])}>
              <option value="topic">{tr("Topic exam")}</option>
              <option value="mock">{tr("Mock exam")}</option>
              <option value="summative">{tr("Summative assessment for the unit")}</option>
              <option value="revision">{tr("Revision")}</option>
              <option value="custom">{tr("Custom exam")}</option>
            </Select>
          </Field>
          {kind === "topic" && (
            <Field label={tr("Topic")} htmlFor="topic_id">
              <Select id="topic_id" name="topic_id" defaultValue={exam?.topic_id ?? ""}>
                <option value="">—</option>
                {topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </Select>
            </Field>
          )}
          {summative && (
            <Field label={tr("Unit")} htmlFor="unit_id" hint={tr("Open and close it for classes on the Summative Assessments page.")}>
              <Select id="unit_id" name="unit_id" defaultValue={exam?.unit_id ?? defaultUnitId ?? ""} required>
                <option value="">—</option>
                {units.map((u) => <option key={u.id} value={u.id}>{tr(u.label)}</option>)}
              </Select>
            </Field>
          )}
          <Field label={tr("Paper")} htmlFor="paper" hint={kind === "mock" ? tr("Required for mock exams.") : undefined}>
            <Select id="paper" name="paper" defaultValue={paperNumber ? String(paperNumber) : ""}>
              <option value="">—</option>
              <option value="1">{tr("Paper 1")}</option>
              <option value="2">{tr("Paper 2")}</option>
              <option value="3">{tr("Paper 3")}</option>
            </Select>
          </Field>
          {kind === "mock" && (
            <Field label={tr("Year")} htmlFor="year"><Input id="year" name="year" type="number" min={2000} max={2100} defaultValue={exam?.year ?? new Date().getFullYear()} /></Field>
          )}
          {!summative && (
            <Field label={tr("Grade")} htmlFor="grade">
              <Select id="grade" name="grade" defaultValue={exam?.grade ? String(exam.grade) : ""}>
                <option value="">{tr("Any")}</option>
                {[7, 8, 9, 10, 11, 12].map((g) => (
                  <option key={g} value={String(g)}>{g}</option>
                ))}
              </Select>
            </Field>
          )}
          <Field label={tr("Duration (minutes)")} htmlFor="duration_minutes">
            <Input id="duration_minutes" name="duration_minutes" type="number" min={1} max={600} defaultValue={exam?.duration_minutes ?? (defaultKind === "summative" ? 40 : 45)} required />
          </Field>
          <Field label={tr("Attempt limit")} htmlFor="attempt_limit" hint={tr("Empty = unlimited.")}>
            <Input id="attempt_limit" name="attempt_limit" type="number" min={1} max={50} defaultValue={exam?.attempt_limit ?? (!exam && defaultKind === "summative" ? 1 : "")} />
          </Field>
          <Field label={tr("Available from")} htmlFor="availability_start"><Input id="availability_start" name="availability_start" type="datetime-local" defaultValue={toLocal(exam?.availability_start)} /></Field>
          <Field label={tr("Available until")} htmlFor="availability_end"><Input id="availability_end" name="availability_end" type="datetime-local" defaultValue={toLocal(exam?.availability_end)} /></Field>
        </div>
        <Field label={tr("Description")} htmlFor="description"><Textarea id="description" name="description" rows={2} defaultValue={exam?.description ?? ""} /></Field>
        <Field label={tr("Instructions shown before the exam (Markdown)")} htmlFor="instructions"><Textarea id="instructions" name="instructions" rows={3} defaultValue={exam?.instructions ?? ""} /></Field>
        <div className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2">
          <Field label={tr("Integrity policy")} htmlFor="integrity_mode">
            <Select id="integrity_mode" name="integrity_mode" defaultValue={exam?.integrity_mode ?? "warn"}>
              <option value="monitor">{tr("Monitor only")}</option>
              <option value="warn">{tr("Warning")}</option>
              <option value="auto_submit">{tr("Auto-submit after N violations")}</option>
            </Select>
          </Field>
          <Field label={tr("Maximum violations")} htmlFor="max_violations"><Input id="max_violations" name="max_violations" type="number" min={1} max={50} defaultValue={exam?.max_violations ?? 3} /></Field>
          <div className="space-y-2 sm:col-span-2">
            <Checkbox name="require_fullscreen" defaultChecked={exam?.require_fullscreen ?? true} label={tr("Require fullscreen (exits are recorded)")} />
            <Checkbox name="show_results" defaultChecked={exam?.show_results ?? true} label={tr("Show results to students when marked")} />
            <Checkbox name="show_mark_scheme" defaultChecked={exam?.show_mark_scheme ?? false} label={tr("Show mark scheme and model answers with results")} />
          </div>
          <Field label={tr("Release results at (optional)")} htmlFor="results_release_at"><Input id="results_release_at" name="results_release_at" type="datetime-local" defaultValue={toLocal(exam?.results_release_at)} /></Field>
        </div>
      </fieldset>
      {!readOnly && <Button type="submit" disabled={pending}>{pending ? tr("Saving…") : exam ? tr("Save settings") : tr("Create exam")}</Button>}
    </form>
  );
}
