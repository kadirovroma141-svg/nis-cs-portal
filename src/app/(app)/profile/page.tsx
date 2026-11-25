import type { Metadata } from "next";
import { requireProfile, displayName } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getStudentClasses } from "@/lib/student-data";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/change-password-form";
import { LocaleSwitch } from "@/components/locale-switch";
import { ThemeSelector } from "@/components/theme-toggle";

import { ProfileHcdSettings } from "@/components/hcd/profile-hcd-settings";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Profile") };
}

export default async function ProfilePage() {
  const t = await getT();
  const profile = await requireProfile();
  const supabase = await createClient();
  const classes = profile.role === "student" ? await getStudentClasses(supabase, profile.id) : [];
  const rows: [string, string][] = [
    ["Full name", displayName(profile)],
    ["Username", profile.username],
    ["Role", t({ student: "Student", teacher: "Teacher", admin: "Administrator" }[profile.role])],
    ...(profile.grade ? ([["Grade", String(profile.grade)]] as [string, string][]) : []),
    ...(classes.length
      ? ([["Class", classes.map((c) => `${c.name}${c.teacher ? ` (${c.teacher.first_name} ${c.teacher.last_name})` : ""}`).join(", ")]] as [string, string][])
      : []),
    ["Member since", formatDate(profile.created_at, false, t)],
  ];
  return (
    <>
      <PageHeader title={t("Profile")} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("Account")} />
          <CardBody>
            <dl className="space-y-3 text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[8rem_1fr] gap-2">
                  <dt className="label-mono pt-0.5 text-muted">{t(k)}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-6">
              <p className="text-sm font-medium">{t("Interface language")}</p>
              <LocaleSwitch className="mt-1.5" />
            </div>
            <p className="mt-2 text-xs text-muted">{t("Lesson content (theory, questions, topic names) is shown as written by the teacher.")}</p>
            <div className="mt-6 space-y-1.5">
              <p className="text-sm font-medium">{t("Theme")}</p>
              <ThemeSelector />
              <p className="text-xs text-muted">{t("“System” follows your device setting. Saved in this browser.")}</p>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title={t("Эргономика и доступность (ISO 9241-210)")} />
            <CardBody>
              <ProfileHcdSettings />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t("Change password")} />
            <CardBody>
              <ChangePasswordForm stay />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
