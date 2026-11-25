import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTeacherClasses } from "@/lib/teacher-data";
import { ACADEMIC_YEAR } from "@/lib/env";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionForm } from "@/components/action-form";
import { createClass, importStudents } from "../actions";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Classes") };
}

export default async function ClassesPage() {
  const t = await getT();
  const profile = await requireProfile(["teacher", "admin"]);
  const supabase = await createClient();
  const classes = await getTeacherClasses(supabase, profile);
  return (
    <>
      <PageHeader title={t("Classes")} description={t("Your classes for this academic year.")} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {classes.length === 0 ? (
            <EmptyState title={t("No classes yet")}>{t("Create a class, then add students individually or import a CSV file.")}</EmptyState>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {classes.map((c) => (
                <Link key={c.id} href={`/teacher/classes/${c.id}`} className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-primary/40 hover:bg-surface-2">
                  <p className="text-2xl font-semibold">{c.name}</p>
                  <p className="text-sm text-muted">{t("Grade")}{" "}{c.grade} · {c.academic_year}</p>
                  <p className="mt-3 text-sm font-medium">{c.member_count}{" "}{t("student")}{c.member_count === 1 ? "" : "s"}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title={t("New class")} />
            <CardBody>
              <ActionForm action={createClass} submitLabel={t("Create class")}>
                <Field label={t("Name")} htmlFor="name"><Input id="name" name="name" placeholder="12A" required maxLength={40} /></Field>
                <Field label={t("Grade")} htmlFor="grade">
                  <Select id="grade" name="grade" defaultValue="11">
                    {[7, 8, 9, 10, 11, 12].map((g) => (
                      <option key={g} value={String(g)}>{g}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={t("Academic year")} htmlFor="academic_year"><Input id="academic_year" name="academic_year" defaultValue={ACADEMIC_YEAR} /></Field>
              </ActionForm>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t("Import students (CSV)")} description={t("Columns: first_name, last_name, username, class, grade")} />
            <CardBody>
              <ActionForm action={importStudents} submitLabel={t("Import")} pendingLabel={t("Importing…")}>
                <input type="file" name="file" accept=".csv,text/csv" required className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary" />
                <p className="text-xs text-muted">
                  {t("New accounts get the temporary password and must change it at first login. Missing classes are created for you.")}
                </p>
              </ActionForm>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
