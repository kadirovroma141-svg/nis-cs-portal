import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { seesPapers } from "@/lib/progress";
import { getMocks } from "@/lib/mocks";
import { PageHeader } from "@/components/ui/page-header";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Mock Exams") };
}

export default async function MockYearPage({ params }: PageProps<"/mock-exams/[year]">) {
  const t = await getT();
  if (!seesPapers(await requireProfile())) redirect("/learn");
  const year = Number((await params).year);
  const mocks = await getMocks({ year });
  return (
    <>
      <PageHeader breadcrumbs={[{ label: "Mock Exams", href: "/mock-exams" }, { label: String(year) }]} title={t("Mock Exams {year}", { year })} />
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((p) => {
          const list = mocks.filter((m) => m.paper?.number === p);
          return (
            <Link key={p} href={`/mock-exams/${year}/${p}`} className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-primary/40 hover:bg-surface-2">
              <p className="text-xl font-semibold">{t("Paper")}{" "}{p}</p>
              <p className="text-sm text-muted">{list.length ? t("{length} mock{v1}", { length: list.length, v1: list.length === 1 ? "" : "s" }) : t("None yet")}</p>
            </Link>
          );
        })}
      </div>
    </>
  );
}
