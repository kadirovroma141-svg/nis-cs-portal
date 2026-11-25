import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { requireProfile, isStaff, shortName } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { LocaleSwitch } from "@/components/locale-switch";
import { ThemeCycleButton } from "@/components/theme-toggle";
import { Brain, ExternalLink, LogOut } from "@/components/icons";
import { REPEAT_ON_SUBDOMAIN, rp } from "@/lib/repeat-path";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: { default: t("Repeat"), template: `%s · ${t("Repeat")}` } };
}

/** The main site's origin, from the repeat host (repeat.example.kz → example.kz). */
async function mainOrigin() {
  const h = await headers();
  const host = (h.get("host") ?? "").replace(/^repeat\./i, "");
  const proto = h.get("x-forwarded-proto") ?? (/^(localhost|127\.)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function RepeatLayout({ children }: { children: ReactNode }) {
  const [profile, t, main] = await Promise.all([requireProfile(), getT(), REPEAT_ON_SUBDOMAIN ? mainOrigin() : "/"]);
  const nav = [
    { href: "/", label: t("Today") },
    { href: "/review", label: t("Daily review") },
    ...(isStaff(profile) ? [{ href: "/teacher", label: t("Class summary") }] : []),
  ];
  return (
    <div className="repeat-theme min-h-screen bg-background text-fg">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link href={rp("/")} className="flex items-center gap-2 font-bold">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-fg">
              <Brain className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              {t("Repeat")}
              <span className="block text-[11px] font-medium text-muted">{t("Understand · recall · remember")}</span>
            </span>
          </Link>
          <nav aria-label={t("Navigation")} className="order-3 flex w-full gap-1 sm:order-none sm:w-auto">
            {nav.map((n) => (
              <Link key={n.href} href={rp(n.href)} className="rounded-full px-3 py-1.5 text-sm font-medium text-muted hover:bg-primary-soft hover:text-primary">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <a href={main} className="hidden items-center gap-1 rounded-full px-3 py-1.5 text-sm text-muted hover:bg-surface-2 hover:text-fg md:inline-flex">
              {t("Main site")} <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <LocaleSwitch className="rounded-full border-border" />
            <ThemeCycleButton />
            <span className="hidden text-sm text-muted lg:inline">{shortName(profile)}</span>
            <form action="/auth/signout" method="post">
              <button type="submit" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-fg" aria-label={t("Sign out")} title={t("Sign out")}>
                <LogOut className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
