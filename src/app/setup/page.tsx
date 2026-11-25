import type { Metadata } from "next";
import { isSupabaseConfigured } from "@/lib/env";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Setup required") };
}

export default async function SetupPage() {
  const t = await getT();
  if (isSupabaseConfigured()) redirect("/");
  return (
    <main id="main" className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">{t("Setup required")}</h1>
      <p className="mt-3 text-muted">
        {t("The platform is not connected to a Supabase project yet. Copy")}{" "}<code>.env.example</code>{" "}{t("to")}{" "}
        <code>.env.local</code>{t(", fill in your project URL and keys, run the migrations and restart the server. See")}{" "}
        <code>README.md</code>{" "}{t("for the full steps.")}
      </p>
      <pre className="mt-6 overflow-x-auto rounded-lg border border-border bg-surface p-4 text-sm">
{`NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # server only
OPENAI_API_KEY=...              # server only`}
      </pre>
    </main>
  );
}
