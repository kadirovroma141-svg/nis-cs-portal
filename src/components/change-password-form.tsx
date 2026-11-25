"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";
import { changePassword, type ChangePasswordState } from "@/app/(auth)/change-password/actions";
import { useT } from "@/lib/i18n/client";

export function ChangePasswordForm({ stay = false }: { stay?: boolean }) {
  const t = useT();
  const [state, action, pending] = useActionState<ChangePasswordState, FormData>(changePassword, {});
  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.done && <Alert tone="success">{t("Your password has been changed.")}</Alert>}
      {stay && <input type="hidden" name="redirect" value="stay" />}
      <Field label={t("New password")} htmlFor="password" hint={t("At least {MIN_PASSWORD_LENGTH} characters, with letters and numbers.", { MIN_PASSWORD_LENGTH })}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} />
      </Field>
      <Field label={t("Confirm new password")} htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t("Saving…") : t("Change password")}
      </Button>
    </form>
  );
}
