import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { seesPapers } from "@/lib/progress";
import { getMocks } from "@/lib/mocks";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { GraduationCap } from "@/components/icons";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Mock Exams") };
}

export default async function MockExamsPage() {
  const t = await getT();
  if (!seesPapers(await requireProfile())) redirect("/learn");
  const mocks = await getMocks();
  const years = [...new Set(mocks.map((m) => m.year))].sort((a, b) => b - a);
  return (
    <>
      <PageHeader title={t("Mock Exams")} description={t("Full-length practice papers under exam conditions, organised by year and paper.")} />
      {years.length === 0 ? (
        <EmptyState title={t("No mock exams published yet")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {years.map((y) => {
            const list = mocks.filter((m) => m.year === y);
            return (
              <Link key={y} href={`/mock-exams/${y}`} className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-primary/40 hover:bg-surface-2">
                <GraduationCap className="h-6 w-6 text-primary" />
                <p className="mt-3 text-2xl font-semibold">{y}</p>
                <p className="text-sm text-muted">
                  {[1, 2, 3].map((p) => `Paper ${p}: ${list.filter((m) => m.paper?.number === p).length}`).join(" · ")}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
