import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile, displayName } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTeacherClasses } from "@/lib/teacher-data";
import { ACADEMIC_YEAR } from "@/lib/env";
import type { Profile } from "@/lib/db-types";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { Field, Input, Select } from "@/components/ui/form";
import { ActionForm, ConfirmButton, InlineActionForm, SubmitButton } from "@/components/action-form";
import { archiveClass, assignClassTeacher } from "../actions";
import { createClass } from "../../teacher/actions";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("All classes") };
}

export default async function AdminClassesPage() {
  const tx = await getT();
  const me = await requireProfile(["admin"]);
  const supabase = await createClient();
  const classes = await getTeacherClasses(supabase, me, true);
  const { data: teachers } = await supabase.from("profiles").select("id, first_name, last_name, username").in("role", ["teacher", "admin"]).order("last_name");
  const staff = (teachers ?? []) as Pick<Profile, "id" | "first_name" | "last_name" | "username">[];
  return (
    <>
      <PageHeader title={tx("Classes")} description={tx("{length} active classes", { length: classes.length })} />
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <Card>
          <CardBody className="p-0">
            <Table>
              <thead><tr><Th>{tx("Class")}</Th><Th>{tx("Grade")}</Th><Th>{tx("Year")}</Th><Th>{tx("Students")}</Th><Th>{tx("Teacher")}</Th><Th className="text-right">{tx("Archive")}</Th></tr></thead>
              <tbody>
                {classes.map((c) => (
                  <tr key={c.id}>
                    <Td><Link href={`/teacher/classes/${c.id}`} className="font-medium hover:underline">{c.name}</Link></Td>
                    <Td>{c.grade}</Td>
                    <Td>{c.academic_year}</Td>
                    <Td className="tabular-nums">{c.member_count}</Td>
                    <Td>
                      <InlineActionForm action={assignClassTeacher} className="flex gap-2">
                        <input type="hidden" name="class_id" value={c.id} />
                        <Select name="teacher_id" defaultValue={c.teacher_id ?? ""} aria-label={tx("Teacher for {name}", { name: c.name })} className="h-8 text-xs">
                          <option value="">—</option>
                          {staff.map((t) => <option key={t.id} value={t.id}>{displayName(t)}</option>)}
                        </Select>
                        <SubmitButton size="sm" variant="secondary">{tx("Set")}</SubmitButton>
                      </InlineActionForm>
                    </Td>
                    <Td className="text-right"><ConfirmButton action={archiveClass} fields={{ class_id: c.id }} label={tx("Archive")} variant="ghost" confirm={tx("Archive {name}?", { name: c.name })} /></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={tx("New class")} />
          <CardBody>
            <ActionForm action={createClass} submitLabel={tx("Create class")}>
              <Field label={tx("Name")} htmlFor="name"><Input id="name" name="name" required /></Field>
              <Field label={tx("Grade")} htmlFor="grade">
                <Select id="grade" name="grade">
                  {[7, 8, 9, 10, 11, 12].map((g) => (
                    <option key={g} value={String(g)}>{g}</option>
                  ))}
                </Select>
              </Field>
              <Field label={tx("Academic year")} htmlFor="ay"><Input id="ay" name="academic_year" defaultValue={ACADEMIC_YEAR} /></Field>
              <Field label={tx("Teacher")} htmlFor="teacher_id">
                <Select id="teacher_id" name="teacher_id" defaultValue={me.id}>
                  {staff.map((t) => <option key={t.id} value={t.id}>{displayName(t)}</option>)}
                </Select>
              </Field>
            </ActionForm>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
