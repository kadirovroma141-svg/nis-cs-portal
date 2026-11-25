"use client";
import { useActionState, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "@/components/icons";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n/client";

export type FormState = { ok?: boolean; error?: string; message?: string; details?: string[] };

/** A form bound to a server action that reports success / error inline. */
export function ActionForm({
  action,
  children,
  submitLabel = "Save",
  pendingLabel = "Saving…",
  className,
  submitVariant = "primary",
}: {
  action: (prev: FormState, data: FormData) => Promise<FormState>;
  children: ReactNode;
  submitLabel?: string;
  pendingLabel?: string;
  className?: string;
  submitVariant?: "primary" | "secondary" | "danger" | "success";
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  return (
    <form action={formAction} className={className ?? "space-y-4"}>
      {state.error && (
        <Alert tone="danger" title={t(state.error)}>
          {state.details && state.details.length > 0 && (
            <ul className="list-disc pl-4 text-xs">{state.details.map((d, i) => <li key={i}>{d}</li>)}</ul>
          )}
        </Alert>
      )}
      {state.ok && state.message && (
        <Alert tone="success" title={t(state.message)}>
          {state.details && state.details.length > 0 && (
            <ul className="list-disc pl-4 text-xs">{state.details.map((d, i) => <li key={i}>{d}</li>)}</ul>
          )}
        </Alert>
      )}
      {children}
      <Button type="submit" variant={submitVariant} disabled={pending} aria-busy={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}

/** Submit button for any <form action={...}>: disabled with a spinner while the action runs. */
export function SubmitButton({ children, pendingLabel, disabled, ...props }: ComponentProps<typeof Button> & { pendingLabel?: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending} {...props}>
      {pending && <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />}
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}

/** A server action that may report a problem or a short confirmation. */
type InlineAction = (data: FormData) => Promise<FormState | void>;

function useInlineAction(action: InlineAction) {
  return useActionState<FormState, FormData>(async (_prev, data) => (await action(data)) ?? {}, {});
}

function InlineStatus({ state }: { state: FormState }) {
  const t = useT();
  if (state.error) return <p role="alert" className="text-xs font-medium text-danger">{t(state.error)}</p>;
  if (state.ok && state.message) return <p role="status" className="text-xs font-medium text-success">{t(state.message)}</p>;
  return null;
}

/**
 * Wraps a one-shot server action form (no field-level validation): shows a
 * spinner on its SubmitButton and the action's error/confirmation under it.
 */
export function InlineActionForm({ action, children, className }: { action: InlineAction; children: ReactNode; className?: string }) {
  const [state, formAction] = useInlineAction(action);
  return (
    <div className="space-y-1">
      <form action={formAction} className={className}>
        {children}
      </form>
      <InlineStatus state={state} />
    </div>
  );
}

/** Small button form for one-click server actions (with optional confirmation). */
export function ConfirmButton({
  action,
  fields,
  label,
  confirm,
  variant = "secondary",
  size = "sm",
  className,
}: {
  action: InlineAction;
  fields: Record<string, string>;
  label: ReactNode;
  confirm?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  className?: string;
}) {
  const [state, formAction, pending] = useInlineAction(action);
  return (
    <form
      action={formAction}
      className={cn("inline-flex flex-col items-end gap-1", className)}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <Button type="submit" variant={variant} size={size} disabled={pending} aria-busy={pending}>
        {pending && <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />}
        {label}
      </Button>
      {!pending && <InlineStatus state={state} />}
    </form>
  );
}
