import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/change-password-form";
import { getCurrentProfile, homeFor } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Change password") };
}

export default async function ChangePasswordPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.force_password_change) redirect(homeFor(profile.role));
  const t = await getT();
  return (
    <Card>
      <CardBody className="space-y-5 p-6">
        <div>
          <h1 className="text-xl font-semibold">{t("Choose a new password")}</h1>
          <p className="mt-2 text-sm text-muted">
            {t("Welcome, {name}. Before you continue, replace your temporary password with one only you know.", {
              name: profile.first_name || profile.username,
            })}
          </p>
        </div>
        <ChangePasswordForm />
        <form action="/auth/signout" method="post" className="text-center">
          <button type="submit" className="text-sm text-muted underline-offset-2 hover:underline">
            {t("Sign out")}
          </button>
        </form>
      </CardBody>
    </Card>
  );
}
