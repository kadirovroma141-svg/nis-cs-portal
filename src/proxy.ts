import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, authCookieOptions, isSupabaseConfigured } from "./lib/env";
import { REPEAT_ON_SUBDOMAIN } from "./lib/repeat-path";
import { PROFILE_QUERY_TIMEOUT_MS, profileGate } from "./lib/profile-gate";

// Refreshes the Supabase session cookie and performs optimistic routing:
// signed-out users → /login, forced password change → /change-password,
// role areas (/teacher, /admin), and students with an exam in progress are
// kept on the exam page. Pages re-check authorisation with requireProfile().
//
// Host repeat.* serves the repeat site: its pages live under /repeat (route
// group (repeat)) and are rewritten there, so repeat.<domain>/review renders
// /repeat/review. Sign-in, password change and APIs are shared with the main
// site and served as they are.

const PUBLIC = ["/login", "/setup", "/auth/signout"];
const HOME: Record<string, string> = {
  admin: "/admin",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
};

const REPEAT_HOST = /^repeat\./i;
const REPEAT_SHARED = ["/login", "/setup", "/auth/", "/change-password", "/api/"];

function redirectTo(request: NextRequest, path: string | URL, carry?: NextResponse) {
  const url = typeof path === "string" ? new URL(path, request.url) : path;
  // request.url may carry the server's own host; stay on repeat.* when the visitor is there.
  const host = request.headers.get("host");
  if (typeof path === "string" && host && REPEAT_HOST.test(host)) url.host = host;
  const res = NextResponse.redirect(url);
  carry?.cookies.getAll().forEach((c) => res.cookies.set(c));
  return res;
}

/** The same path on the other host (main ⇄ repeat). */
function otherHost(request: NextRequest, host: string, path: string) {
  const url = new URL(path, request.url);
  url.host = REPEAT_HOST.test(host) ? host.replace(REPEAT_HOST, "") : `repeat.${host}`;
  return url;
}

function rewriteRepeat(request: NextRequest, path: string, carry: NextResponse) {
  const url = request.nextUrl.clone();
  url.pathname = path === "/" ? "/repeat" : `/repeat${path}`;
  const res = NextResponse.rewrite(url, { request });
  carry.cookies.getAll().forEach((c) => res.cookies.set(c));
  return res;
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isApi = path.startsWith("/api/");
  const host = request.headers.get("host") ?? "";
  const isRepeat = REPEAT_HOST.test(host);
  const repeatPage = isRepeat && !REPEAT_SHARED.some((p) => path === p || path.startsWith(p.endsWith("/") ? p : `${p}/`));
  // With its own subdomain the repeat site is not served on the main host; without one
  // (*.vercel.app, localhost) it stays here under /repeat.
  if (REPEAT_ON_SUBDOMAIN && !isRepeat && (path === "/repeat" || path.startsWith("/repeat/"))) {
    return NextResponse.redirect(otherHost(request, host, path.slice("/repeat".length) || "/"));
  }

  if (!isSupabaseConfigured()) {
    return path === "/setup" || isApi ? NextResponse.next() : redirectTo(request, "/setup");
  }
  if (path.startsWith("/api/cron/")) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookieOptions: authCookieOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  const isPublic = PUBLIC.some((p) => path === p || path.startsWith(`${p}/`));

  // A server action (e.g. signIn on /login) must get its own RSC response: a
  // redirect here would hand the form an HTML page ("unexpected response").
  // The action redirects by itself once it has run.
  if (isPublic && request.headers.has("next-action")) return response;

  if (!uid) {
    if (isPublic) return response;
    if (isApi) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    const next = path === "/" && !isRepeat ? "" : `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return redirectTo(request, `/login${next}`, response);
  }

  const { data: row, error: profileError } = await supabase
    .from("profiles")
    .select("role, force_password_change, is_active")
    .eq("id", uid)
    .abortSignal(AbortSignal.timeout(PROFILE_QUERY_TIMEOUT_MS))
    .maybeSingle();
  const gate = profileGate(row, profileError);

  if (gate.kind === "unavailable") {
    // Database outage: keep the session. Pages re-check with requireProfile() and show
    // the error screen with «Повторить»; the routing below is only optimistic.
    console.error("proxy: profile query failed", profileError);
    if (isApi) return NextResponse.json({ error: "Database unavailable, try again" }, { status: 503 });
    return response;
  }
  if (gate.kind === "disabled") {
    if (path === "/auth/signout") return response;
    return redirectTo(request, "/auth/signout?error=disabled", response);
  }
  const profile = gate.profile;

  if (profile.force_password_change) {
    if (path === "/change-password" || path === "/auth/signout") return response;
    if (isApi) return NextResponse.json({ error: "Password change required" }, { status: 403 });
    return redirectTo(request, "/change-password", response);
  }

  if (isRepeat) return repeatRoute(request, path, profile.role, uid, supabase, response, repeatPage);

  const home = HOME[profile.role] ?? "/login";
  if (path === "/" || path === "/login" || path === "/change-password") return redirectTo(request, home, response);
  if (path.startsWith("/admin") && profile.role !== "admin") return redirectTo(request, home, response);
  if (path.startsWith("/teacher") && profile.role === "student") return redirectTo(request, home, response);
  if (path.startsWith("/student") && profile.role !== "student") return redirectTo(request, home, response);

  // Navigation is restricted while an exam is running.
  if (profile.role === "student" && !isApi && !path.startsWith("/attempt/") && path !== "/auth/signout") {
    const open = await openAttempt(supabase, uid);
    if (open) return redirectTo(request, `/attempt/${open}`, response);
  }

  return response;
}

type Supa = ReturnType<typeof createServerClient>;

async function openAttempt(supabase: Supa, uid: string): Promise<string | null> {
  const { data } = await supabase
    .from("attempts")
    .select("id")
    .eq("student_id", uid)
    .eq("status", "IN_PROGRESS")
    .gt("deadline_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/** Signed-in routing on repeat.*: main-site homes → the repeat home, /teacher for staff, exams win. */
async function repeatRoute(request: NextRequest, path: string, role: string, uid: string, supabase: Supa, response: NextResponse, page: boolean) {
  if (path === "/teacher/dashboard") return redirectTo(request, "/teacher", response);
  if (path === "/login" || path === "/change-password" || path.startsWith("/student") || path.startsWith("/admin")) {
    return redirectTo(request, "/", response);
  }
  if (path.startsWith("/teacher") && role === "student") return redirectTo(request, "/", response);
  if (role === "student" && page && path !== "/auth/signout") {
    const open = await openAttempt(supabase, uid);
    if (open) return redirectTo(request, otherHost(request, request.headers.get("host") ?? "", `/attempt/${open}`), response);
  }
  return page ? rewriteRepeat(request, path, response) : response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|woff2?)$).*)"],
};
