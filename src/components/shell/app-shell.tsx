import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Bell, LogOut, Search } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import { displayName } from "@/lib/auth";
import { getDictionary, type T } from "@/lib/i18n";
import { getLocale, getT } from "@/lib/i18n/server";
import type { Profile } from "@/lib/db-types";
import { navFor } from "./nav";
import { seesPapers } from "@/lib/progress";
import { NavBar } from "./nav-links";
import { MobileNav } from "./mobile-nav";
import { SectionTabs } from "./section-tabs";
import { ThemeCycleButton } from "@/components/theme-toggle";
import { LocaleSwitch } from "@/components/locale-switch";
import { HcdButton } from "@/components/hcd/hcd-button";
import { RestBreakAlert } from "@/components/hcd/rest-break-alert";
import { TopProgress } from "./top-progress";

/** Stamp-style mark: an ink square with a cursor, plus the wordmark. */
export function Brand({ sub }: { sub: string }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border-2 border-ink bg-accent font-mono text-sm font-bold text-accent-fg shadow-[2px_2px_0_0_var(--ink)] transition-transform group-hover:-rotate-6"
      >
        &gt;_
      </span>
      <span className="leading-none">
        <span className="block font-display text-[0.9rem] font-semibold tracking-tight">NIS·CS</span>
        <span className="label-mono mt-1 block text-muted">{sub}</span>
      </span>
    </Link>
  );
}

function ProfileLink({ profile, t, className }: { profile: Profile; t: T; className?: string }) {
  const role = { student: "Student", teacher: "Teacher", admin: "Administrator" }[profile.role];
  return (
    <Link href="/profile" className={`items-center gap-2 rounded-md px-1.5 py-1 hover:bg-surface-2 ${className ?? "flex"}`}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-[1.5px] border-ink bg-primary-soft font-mono text-xs font-bold text-primary">
        {(profile.first_name[0] ?? profile.username[0] ?? "?").toUpperCase()}
        {(profile.last_name[0] ?? "").toUpperCase()}
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block max-w-36 truncate text-sm font-semibold">{displayName(profile)}</span>
        <span className="label-mono block text-muted">{t(role)}</span>
      </span>
    </Link>
  );
}

function BellLink({ label, t, unread = 0 }: { label: string; t: T; unread?: number }) {
  return (
    <Link
      href="/notifications"
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-surface-2"
      aria-label={unread ? t("{label} ({n} unread)", { label, n: unread }) : label}
    >
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-xs border border-ink bg-accent px-0.5 font-mono text-[10px] font-bold text-accent-fg">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}

function SignOutButton({ label, className }: { label: string; className?: string }) {
  return (
    <form action="/auth/signout" method="post" className={className}>
      <button
        type="submit"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-danger-soft hover:text-danger"
        aria-label={label}
        title={label}
      >
        <LogOut className="h-5 w-5" />
      </button>
    </form>
  );
}

/** Streams in after the shell so the unread count never blocks the first paint. */
async function NotificationsBell({ label, t }: { label: string; t: T }) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  return <BellLink label={label} t={t} unread={count ?? 0} />;
}

export async function AppShell({ profile, children }: { profile: Profile; children: ReactNode }) {
  const locale = await getLocale();
  const t = await getT();
  const d = getDictionary(locale);
  const groups = navFor(profile.role, d, { papers: seesPapers(profile) });
  const brand = <Brand sub={t("Grades 7–12")} />;

  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={null}>
        <TopProgress />
      </Suspense>
      <RestBreakAlert />
      <header data-app-chrome className="sticky top-0 z-30 border-b-2 border-ink bg-surface print:hidden">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          {brand}
          <form action="/search" className="relative ml-2 hidden min-w-0 max-w-sm flex-1 md:block" role="search">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <label htmlFor="global-search" className="sr-only">
              {t("Search")}
            </label>
            <input
              id="global-search"
              name="q"
              type="search"
              placeholder={d.common.search}
              aria-keyshortcuts="/"
              className="peer h-9 w-full rounded-md border-[1.5px] border-border-strong bg-background pl-9 pr-9 text-sm placeholder:text-muted focus:border-ink focus:bg-surface focus:shadow-[3px_3px_0_0_var(--accent)] focus:outline-none"
            />
            <kbd
              aria-hidden
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-xs border border-border-strong px-1.5 font-mono text-[11px] text-muted peer-focus:hidden"
            >
              /
            </kbd>
          </form>
          <div className="ml-auto flex items-center gap-1">
            <Link href="/search" className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-surface-2 md:hidden" aria-label={t("Search")}>
              <Search className="h-5 w-5" />
            </Link>
            <LocaleSwitch className="hidden sm:inline-flex" />
            <HcdButton />
            <ThemeCycleButton />
            <Suspense fallback={<BellLink label={d.common.notifications} t={t} />}>
              <NotificationsBell label={d.common.notifications} t={t} />
            </Suspense>
            <span aria-hidden className="mx-1 hidden h-6 w-px bg-border-strong sm:block" />
            <ProfileLink profile={profile} t={t} className="hidden sm:flex" />
            <SignOutButton label={d.common.signOut} className="hidden sm:block" />
            <MobileNav
              groups={groups}
              brand={brand}
              footer={
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <ProfileLink profile={profile} t={t} className="flex min-w-0" />
                  <div className="flex items-center gap-1">
                    <LocaleSwitch />
                    <SignOutButton label={d.common.signOut} />
                  </div>
                </div>
              }
            />
          </div>
        </div>
        <div className="hidden border-t border-dashed border-border-strong bg-background/70 lg:block">
          <div className="mx-auto w-full max-w-7xl px-4 py-1.5 sm:px-6 lg:px-8">
            <NavBar groups={groups} />
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-7 outline-none sm:px-6 lg:px-8">
        <SectionTabs groups={groups} />
        {children}
      </main>
      <footer className="border-t border-dashed border-border-strong print:hidden">
        <div className="label-mono mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 text-muted sm:px-6 lg:px-8">
          <span>NIS · Computer Science</span>
          <span aria-hidden>{"// 7–12"}</span>
        </div>
      </footer>
    </div>
  );
}
