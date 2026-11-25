import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { getPlacementOptions } from "@/lib/admin-data";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { TopicForm } from "@/components/admin/topic-form";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("New topic") };
}

export default async function NewTopicPage() {
  const t = await getT();
  await requireProfile(["admin"]);
  const { units, sections } = await getPlacementOptions();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader breadcrumbs={[{ label: "Curriculum", href: "/admin/curriculum" }, { label: "New topic" }]} title={t("New topic")} description={t("A topic is stored once and can be placed in the school programme and in any number of paper sections.")} />
      <Card><CardBody className="p-6"><TopicForm units={units} sections={sections} sectionIds={[]} /></CardBody></Card>
    </div>
  );
}
