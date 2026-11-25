"use client";
import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/form";
import { reviewMark, type ActionState } from "@/app/(app)/teacher/actions";
import { useT } from "@/lib/i18n/client";

/** Accept / change mark / edit feedback and reason / request regrade for one answer. The teacher's change is final. */
export function MarkReview({
  resultId,
  attemptId,
  max,
  awarded,
  needsReview,
  teacherFeedback,
  reason = null,
  aiFeedback = null,
}: {
  resultId: string;
  attemptId: string;
  max: number;
  awarded: number | null;
  needsReview: boolean;
  /** prefilled into the editable feedback: the teacher's, else the AI's */
  teacherFeedback: string | null;
  /** prefilled reason: the teacher's last one, else the AI's */
  reason?: string | null;
  /** AI feedback: sent back so an unchanged prefill is not saved as the teacher's */
  aiFeedback?: string | null;
}) {
  const t = useT();
  const [state, action, pending] = useActionState<ActionState, FormData>(reviewMark, {});
  const [mode, setMode] = useState<"none" | "override" | "feedback">(awarded === null ? "override" : "none");
  return (
    <form action={action} className="space-y-3 rounded-lg border border-border bg-surface-2 p-4">
      <input type="hidden" name="result_id" value={resultId} />
      <input type="hidden" name="attempt_id" value={attemptId} />
      {aiFeedback && <input type="hidden" name="ai_feedback" value={aiFeedback} />}
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.ok && <Alert tone="success">{state.message}</Alert>}
      {mode === "override" && (
        <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
          <label className="space-y-1 text-sm">
            <span className="font-medium">{t("Mark (0–")}{max})</span>
            <Input name="mark" type="number" min={0} max={max} step={1} defaultValue={awarded ?? ""} required />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">{t("Reason (logged)")}</span>
            <Input name="reason" required defaultValue={reason ?? ""} placeholder={t("e.g. valid alternative point not in scheme")} />
          </label>
        </div>
      )}
      {mode === "feedback" && (
        <label className="block space-y-1 text-sm">
          <span className="font-medium">{t("Reason (logged)")}</span>
          <Input name="reason" defaultValue={reason ?? ""} />
        </label>
      )}
      {mode !== "none" && (
        <label className="block space-y-1 text-sm">
          <span className="font-medium">{t("Feedback to student")}</span>
          <Textarea name="feedback" rows={2} defaultValue={teacherFeedback ?? ""} />
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        {mode === "none" ? (
          <>
            {needsReview && awarded !== null && (
              <Button type="submit" name="action" value="accept" size="sm" variant="success" disabled={pending}>{t("Accept AI mark")}</Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => setMode("override")}>{t("Change mark")}</Button>
            <Button size="sm" variant="secondary" onClick={() => setMode("feedback")}>{t("Edit feedback")}</Button>
            <Button type="submit" name="action" value="regrade_request" size="sm" variant="ghost" disabled={pending}>{t("Request regrade")}</Button>
          </>
        ) : (
          <>
            <Button type="submit" name="action" value={mode} size="sm" disabled={pending}>{pending ? t("Saving…") : mode === "override" ? t("Save mark") : t("Save feedback")}</Button>
            {awarded !== null && <Button size="sm" variant="ghost" onClick={() => setMode("none")}>{t("Cancel")}</Button>}
          </>
        )}
      </div>
    </form>
  );
}
