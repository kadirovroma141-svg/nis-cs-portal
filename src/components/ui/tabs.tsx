"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n/client";

/** Route-based tabs: the active tab is the one whose href matches the path. */
export function LinkTabs({ tabs, exact = [] }: { tabs: { href: string; label: string }[]; exact?: string[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label={useT()("Sections")} className="flex gap-1.5 overflow-x-auto pb-1">
      {tabs.map((t) => {
        const active = exact.includes(t.href) ? pathname === t.href : pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-md border-[1.5px] px-3 py-1.5 text-sm font-semibold transition-colors",
              active ? "border-ink bg-ink text-background" : "border-border-strong bg-surface text-muted hover:border-ink hover:text-fg",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
