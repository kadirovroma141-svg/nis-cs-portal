import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { getCurrentProfile } from "@/lib/auth";
import { DEFAULT_LOCALE, LOCALE_COOKIE, makeT, parseLocale, type Locale } from "./index";

/** Cookie (this device's last choice) → profile → default. */
export const getLocale = cache(async (): Promise<Locale> => {
  const fromCookie = parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  if (fromCookie) return fromCookie;
  const profile = await getCurrentProfile().catch(() => null);
  return parseLocale(profile?.locale) ?? DEFAULT_LOCALE;
});

/** Server-side translator for the current request. */
export async function getT() {
  return makeT(await getLocale());
}
