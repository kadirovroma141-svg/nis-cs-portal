"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE } from "@/lib/i18n";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function setLocale(formData: FormData): Promise<{ ok?: boolean; error?: string; message?: string }> {
  const profile = await requireProfile();
  const locale = String(formData.get("locale"));
  if (!["en", "ru", "kk"].includes(locale)) return { error: "Unknown language." };
  const { error } = await createAdminClient().from("profiles").update({ locale }).eq("id", profile.id);
  if (error) return { error: "The language could not be saved." };
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}
