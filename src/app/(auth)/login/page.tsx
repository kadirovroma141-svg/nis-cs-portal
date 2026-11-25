import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Sign in") };
}

const NOTICES: Record<string, string> = {
  disabled: "This account is disabled. Contact your teacher or the administrator.",
  signedout: "You have been signed out.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const t = await getT();
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const error = typeof sp.error === "string" && NOTICES[sp.error] ? t(NOTICES[sp.error]) : undefined;
  return (
    <div className="space-y-6">
      <div>
        <p className="label-mono text-accent">{t("School account")}</p>
        <h1 className="mt-2 text-2xl font-semibold">{t("Sign in")}</h1>
        <span aria-hidden className="mt-2 block h-1 w-14 rounded-xs bg-accent" />
        <p className="mt-3 text-sm text-muted">{t("Use the username and password given by your school.")}</p>
      </div>
      <div className="rounded-lg border-2 border-ink bg-surface p-5 shadow-[6px_6px_0_0_var(--ink)]">
        <LoginForm next={next} notice={error} />
      </div>
      <p className="border-l-2 border-accent pl-3 text-xs text-muted">
        {t("First time here? Sign in with your temporary password — you will be asked to choose a new one.")}
      </p>
    </div>
  );
}
