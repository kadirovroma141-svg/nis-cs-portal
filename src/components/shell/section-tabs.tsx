"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { resolveNav, type NavGroup } from "./nav";
import { useT } from "@/lib/i18n/client";

/**
 * Tabs for the pages of the current sidebar section (e.g. Assessment →
 * Assignments · Exams · Summative · Prep). Shown only on the section pages
 * themselves; detail pages below them use breadcrumbs instead.
 */
export function SectionTabs({ groups }: { groups: NavGroup[] }) {
  const t = useT();
  const pathname = usePathname();
  const { item, child, exact } = resolveNav(groups, pathname);
  if (!item?.children || item.children.length < 2 || !exact) return null;
  return (
    <nav aria-label={t(item.label)} className="mb-6 flex gap-1.5 overflow-x-auto pb-1 print:hidden">
      {item.children.map((c) => {
        const active = c === child;
        return (
          <Link
            key={c.href}
            href={c.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-md border-[1.5px] px-3 py-1.5 text-sm font-semibold transition-colors",
              active ? "border-ink bg-accent-soft text-fg" : "border-dashed border-border-strong text-muted hover:border-solid hover:text-fg",
            )}
          >
            {t(c.label)}
          </Link>
        );
      })}
    </nav>
  );
}
