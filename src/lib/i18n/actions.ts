"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { LOCALE_COOKIE, parseLocale } from "./index";

/** Header / login switcher: remembers the language in a cookie and, when signed in, in the profile. */
export async function switchLocale(formData: FormData): Promise<void> {
  const locale = parseLocale(String(formData.get("locale")));
  if (!locale) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  const profile = await getCurrentProfile().catch(() => null);
  if (profile && profile.locale !== locale) {
    await createAdminClient().from("profiles").update({ locale }).eq("id", profile.id);
  }
  revalidatePath("/", "layout");
}
