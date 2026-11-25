import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "@/components/icons";
import { requireProfile, displayName } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { relativeTime } from "@/lib/format";
import type { Profile } from "@/lib/db-types";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ActionForm, ConfirmButton } from "@/components/action-form";
import { createUser, resetPassword, toggleActive, updateUser } from "../actions";
import { importStudents } from "../../teacher/actions";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Users") };
}

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  const t = await getT();
  const me = await requireProfile(["admin"]);
  const sp = await searchParams;
  const role = typeof sp.role === "string" ? sp.role : "";
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const edit = typeof sp.edit === "string" ? sp.edit : "";
  const supabase = await createClient();
  let query = supabase.from("profiles").select("*").order("role").order("last_name").limit(1000);
  if (role) query = query.eq("role", role);
  const [{ data }, { data: classes }] = await Promise.all([
    query,
    supabase.from("classes").select("id, name").is("archived_at", null).order("name"),
  ]);
  const users = ((data ?? []) as Profile[]).filter((u) => !q || `${u.first_name} ${u.last_name} ${u.username}`.toLowerCase().includes(q));
  const editing = users.find((u) => u.id === edit);

  return (
    <>
      <PageHeader title={t("Users")} description={t("{length} accounts", { length: users.length })} />
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <Card>
          <CardBody>
            <form className="grid gap-2 sm:grid-cols-[1fr_10rem_auto]">
              <Input name="q" defaultValue={q} placeholder={t("Search name or username")} aria-label={t("Search")} />
              <Select name="role" defaultValue={role} aria-label={t("Role")}>
                <option value="">{t("All roles")}</option><option value="student">{t("Students")}</option><option value="teacher">{t("Teachers")}</option><option value="admin">{t("Admins")}</option>
              </Select>
              <Button type="submit">{t("Filter")}</Button>
            </form>
          </CardBody>
          <CardBody className="p-0">
            <Table>
              <thead><tr><Th>{t("Name")}</Th><Th>{t("Username")}</Th><Th>{t("Role")}</Th><Th>{t("Grade")}</Th><Th>{t("Status")}</Th><Th>{t("Last activity")}</Th><Th className="text-right">{t("Actions")}</Th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <Td><Link href={`/admin/users?edit=${u.id}${role ? `&role=${role}` : ""}`} className="font-medium hover:underline">{displayName(u)}</Link></Td>
                    <Td className="font-mono text-xs">{u.username}</Td>
                    <Td className="capitalize">{u.role}</Td>
                    <Td>{u.grade ?? "—"}</Td>
                    <Td>{!u.is_active ? <Badge tone="danger">{t("Disabled")}</Badge> : u.force_password_change ? <Badge tone="warning">{t("Temporary password")}</Badge> : <Badge tone="success">{t("Active")}</Badge>}</Td>
                    <Td className="text-muted">{relativeTime(u.last_activity_at, t)}</Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <ConfirmButton action={resetPassword} fields={{ user_id: u.id }} label={<KeyRound className="h-4 w-4" aria-label={t("Reset password")} />} variant="ghost" confirm={t("Reset {username}'s password to the temporary password?", { username: u.username })} />
                        {u.id !== me.id && (
                          <ConfirmButton action={toggleActive} fields={{ user_id: u.id, active: String(!u.is_active) }} label={u.is_active ? t("Disable") : t("Enable")} variant="ghost" confirm={u.is_active ? t("Disable {username}? They will not be able to sign in.", { username: u.username }) : undefined} />
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardBody>
        </Card>
        <div className="space-y-6">
          {editing && (
            <Card>
              <CardHeader title={t("Edit {username}", { username: editing.username })} />
              <CardBody>
                <ActionForm action={updateUser}>
                  <input type="hidden" name="user_id" value={editing.id} />
                  <Field label={t("First name")} htmlFor="e-fn"><Input id="e-fn" name="first_name" defaultValue={editing.first_name} /></Field>
                  <Field label={t("Last name")} htmlFor="e-ln"><Input id="e-ln" name="last_name" defaultValue={editing.last_name} /></Field>
                  <Field label={t("Role")} htmlFor="e-role">
                    <Select id="e-role" name="role" defaultValue={editing.role}><option value="student">{t("Student")}</option><option value="teacher">{t("Teacher")}</option><option value="admin">{t("Admin")}</option></Select>
                  </Field>
                  <Field label={t("Grade (students)")} htmlFor="e-grade">
                    <Select id="e-grade" name="grade" defaultValue={editing.grade ? String(editing.grade) : ""}>
                      <option value="">—</option>
                      {[7, 8, 9, 10, 11, 12].map((g) => (
                        <option key={g} value={String(g)}>{g}</option>
                      ))}
                    </Select>
                  </Field>
                </ActionForm>
              </CardBody>
            </Card>
          )}
          <Card>
            <CardHeader title={t("Create account")} description={t("The user signs in with the temporary password and must change it.")} />
            <CardBody>
              <ActionForm action={createUser} submitLabel={t("Create")}>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("First name")} htmlFor="fn"><Input id="fn" name="first_name" required /></Field>
                  <Field label={t("Last name")} htmlFor="ln"><Input id="ln" name="last_name" required /></Field>
                </div>
                <Field label={t("Username")} htmlFor="un" hint={t("e.g. dias.a — lowercase, no spaces")}><Input id="un" name="username" required /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("Role")} htmlFor="role"><Select id="role" name="role" defaultValue="student"><option value="student">{t("Student")}</option><option value="teacher">{t("Teacher")}</option><option value="admin">{t("Admin")}</option></Select></Field>
                  <Field label={t("Grade")} htmlFor="grade">
                    <Select id="grade" name="grade" defaultValue="11">
                      <option value="">—</option>
                      {[7, 8, 9, 10, 11, 12].map((g) => (
                        <option key={g} value={String(g)}>{g}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <Field label={t("Class (students)")} htmlFor="class_id">
                  <Select id="class_id" name="class_id" defaultValue=""><option value="">—</option>{((classes ?? []) as { id: string; name: string }[]).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
                </Field>
              </ActionForm>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t("Bulk import students")} description={t("CSV: first_name,last_name,username,class,grade")} />
            <CardBody>
              <ActionForm action={importStudents} submitLabel={t("Import")} pendingLabel={t("Importing…")}>
                <input type="file" name="file" accept=".csv,text/csv" required className="block w-full text-sm" />
              </ActionForm>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
