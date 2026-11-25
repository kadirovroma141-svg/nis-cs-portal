// Public configuration (safe for the browser).
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Domain used to turn a school username into the email-shaped Supabase Auth identifier. */
export const AUTH_EMAIL_DOMAIN = process.env.NEXT_PUBLIC_AUTH_EMAIL_DOMAIN ?? "students.internal";

export const ACADEMIC_YEAR = process.env.NEXT_PUBLIC_ACADEMIC_YEAR ?? "2026-2027";

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/**
 * Parent domain for the Supabase session cookie (e.g. ".example.kz"), so that one
 * sign-in works on both the main site and repeat.<domain>. Unset → host-only cookie:
 * each host keeps its own sign-in (same accounts). A distinct cookie name is used
 * when it is set, so old host-only cookies are ignored instead of shadowing it.
 */
export const AUTH_COOKIE_DOMAIN = process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN ?? "";

export const authCookieOptions = AUTH_COOKIE_DOMAIN ? { domain: AUTH_COOKIE_DOMAIN, name: "sb-shared-auth-token" } : undefined;
