"use client";
import { useMemo, useState } from "react";
import { ActionForm } from "@/components/action-form";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { createAssignment } from "@/app/(app)/teacher/actions";
import { useT } from "@/lib/i18n/client";

type Option = { id: string; label: string; group?: string };

export function AssignmentForm({
  classes,
  students,
  exams,
  topics,
  defaultClass,
  defaultExam,
  defaultType,
  defaultTopic,
}: {
  classes: Option[];
  students: Option[];
  exams: (Option & { kind: string })[];
  topics: Option[];
  defaultClass?: string;
  defaultExam?: string;
  defaultType?: string;
  defaultTopic?: string;
}) {
  const tr = useT();
  const initialType = defaultType === "topic"
    ? "topic"
    : defaultExam ? (exams.find((e) => e.id === defaultExam)?.kind === "mock" ? "mock_exam" : "topic_exam") : "topic_exam";
  const [type, setType] = useState(initialType);
  const [mode, setMode] = useState("warn");
  const tz = useMemo(() => new Date().getTimezoneOffset(), []);
  const examOptions = exams.filter((e) => (type === "mock_exam" ? e.kind === "mock" : type === "topic_exam" ? e.kind !== "mock" : true));
  const needsExam = type === "topic_exam" || type === "mock_exam";
  // A whole topic: theory, practice and the topic exam, each with a deadline.
  const isTopic = type === "topic";
  const examSettings = needsExam || isTopic;

  return (
    <ActionForm action={createAssignment} submitLabel={tr("Create assignment")} pendingLabel={tr("Creating…")} className="space-y-6">
      <input type="hidden" name="tz_offset" value={tz} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr("Type")} htmlFor="assignment_type">
          <Select id="assignment_type" name="assignment_type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="topic">{tr("Topic — theory, practice and exam")}</option>
            <option value="topic_exam">{tr("Topic Exam")}</option>
            <option value="mock_exam">{tr("Mock Exam")}</option>
            <option value="practice">{tr("Practice")}</option>
            <option value="revision">{tr("Revision")}</option>
          </Select>
        </Field>
        <Field label={tr("Title")} htmlFor="title">
          <Input id="title" name="title" required={!isTopic} maxLength={200} placeholder={isTopic ? tr("Empty = the topic's name") : tr("e.g. SDLC topic test")} />
        </Field>
      </div>
      {isTopic && (
        <p className="rounded-lg bg-info-soft px-4 py-3 text-sm text-info">
          {tr("Students must read the topic's theory pack, complete its practice set and sit the topic exam in Exam Mode. You will see each student's progress and who is overdue.")}
        </p>
      )}

      {needsExam || type === "revision" ? (
        <Field label={needsExam ? tr("Exam") : tr("Exam (optional)")} htmlFor="exam_id">
          <Select id="exam_id" name="exam_id" defaultValue={defaultExam ?? ""} required={needsExam}>
            <option value="">{tr("Choose…")}</option>
            {examOptions.map((e) => (
              <option key={e.id} value={e.id}>{tr(e.label)}</option>
            ))}
          </Select>
        </Field>
      ) : null}
      {!needsExam && (
        <Field label={tr("Topic")} htmlFor="topic_id">
          <Select id="topic_id" name="topic_id" defaultValue={defaultTopic ?? ""} required={isTopic}>
            <option value="">{tr("Choose…")}</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>{tr(t.label)}</option>
            ))}
          </Select>
        </Field>
      )}

      <Field label={tr("Instructions (optional)")} htmlFor="instructions">
        <Textarea id="instructions" name="instructions" rows={3} />
      </Field>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{tr("Assign to classes")}</legend>
        <div className="flex flex-wrap gap-4">
          {classes.map((c) => (
            <Checkbox key={c.id} name="class_ids" value={c.id} defaultChecked={c.id === defaultClass} label={tr(c.label)} />
          ))}
          {classes.length === 0 && <p className="text-sm text-muted">{tr("You have no classes yet.")}</p>}
        </div>
      </fieldset>
      {students.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-medium">{tr("…or to individual students")}</summary>
          <div className="mt-2 grid max-h-60 gap-1 overflow-y-auto rounded-lg border border-border p-3 sm:grid-cols-2">
            {students.map((s) => (
              <Checkbox key={s.id} name="student_ids" value={s.id} label={tr(s.label)} />
            ))}
          </div>
        </details>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr("Available from")} htmlFor="available_from" hint={tr("Leave empty to open now.")}>
          <Input id="available_from" name="available_from" type="datetime-local" />
        </Field>
        <Field label={isTopic ? tr("Final deadline (exam)") : tr("Deadline")} htmlFor="deadline" hint={isTopic ? tr("Everything, including the topic exam, is due by this time.") : undefined}>
          <Input id="deadline" name="deadline" type="datetime-local" required={isTopic} />
        </Field>
        {isTopic && (
          <>
            <Field label={tr("Theory deadline (optional)")} htmlFor="theory_deadline" hint={tr("Empty = the final deadline.")}>
              <Input id="theory_deadline" name="theory_deadline" type="datetime-local" />
            </Field>
            <Field label={tr("Practice deadline (optional)")} htmlFor="practice_deadline" hint={tr("Empty = the final deadline.")}>
              <Input id="practice_deadline" name="practice_deadline" type="datetime-local" />
            </Field>
            <Field label={tr("Practice to complete (%)")} htmlFor="practice_target" hint={tr("Share of the topic's practice questions each student must answer and check.")}>
              <Input id="practice_target" name="practice_target" type="number" min={1} max={100} defaultValue={100} required />
            </Field>
          </>
        )}
        {examSettings && (
          <>
            <Field label={isTopic ? tr("Exam attempt limit") : tr("Attempt limit")} htmlFor="attempt_limit" hint={tr("Empty = use the exam's limit.")}>
              <Input id="attempt_limit" name="attempt_limit" type="number" min={1} max={20} defaultValue={1} />
            </Field>
            <Field label={tr("Time limit override (minutes)")} htmlFor="duration_override_minutes" hint={tr("Empty = the exam's duration.")}>
              <Input id="duration_override_minutes" name="duration_override_minutes" type="number" min={1} max={600} />
            </Field>
          </>
        )}
      </div>

      {examSettings && (
        <div className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2">
          <Field label={tr("Integrity policy")} htmlFor="integrity_mode">
            <Select id="integrity_mode" name="integrity_mode" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="monitor">{tr("Monitor only")}</option>
              <option value="warn">{tr("Warning")}</option>
              <option value="auto_submit">{tr("Auto-submit after N violations")}</option>
            </Select>
          </Field>
          <Field label={tr("Maximum violations")} htmlFor="max_violations" hint={mode === "auto_submit" ? tr("The exam submits automatically at this count.") : tr("Shown to students in the warning.")}>
            <Input id="max_violations" name="max_violations" type="number" min={1} max={50} defaultValue={3} />
          </Field>
          <div className="space-y-2 sm:col-span-2">
            <Checkbox name="show_results" defaultChecked label={tr("Show results to students when marked")} />
            <Checkbox name="show_mark_scheme" label={tr("Show mark scheme and model answers with results")} />
          </div>
          <Field label={tr("Release results at (optional)")} htmlFor="results_release_at" hint={tr("Hide marks, feedback and mark scheme until this time.")}>
            <Input id="results_release_at" name="results_release_at" type="datetime-local" />
          </Field>
        </div>
      )}
      {!examSettings && (
        <>
          <input type="hidden" name="integrity_mode" value="monitor" />
          <input type="hidden" name="max_violations" value="3" />
          <input type="hidden" name="show_results" value="on" />
        </>
      )}
    </ActionForm>
  );
}
