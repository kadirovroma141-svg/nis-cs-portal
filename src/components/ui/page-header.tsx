import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "@/components/icons";
import { T } from "./t";

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}) {
  return (
    <header className="mb-7 space-y-2">
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[1.55rem] font-semibold leading-tight sm:text-[1.75rem]">{title}</h1>
          <span aria-hidden className="mt-2 block h-1 w-14 rounded-xs bg-accent" />
          {description && <p className="mt-2.5 max-w-3xl text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

type Crumb = { label: string; href?: string };

/** Full trail from `sm` up; on phones a single "back to parent" link saves the row. */
function Breadcrumbs({ items }: { items: Crumb[] }) {
  const parent = [...items].reverse().find((b) => b.href);
  return (
    <>
      {parent && (
        <Link
          href={parent.href!}
          className="inline-flex max-w-full items-center gap-1 rounded-md py-1 pr-2 text-sm font-medium text-muted hover:text-fg sm:hidden print:hidden"
        >
          <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">{parent.label}</span>
        </Link>
      )}
      <nav aria-labelledby="breadcrumb-label" className="hidden flex-wrap items-center gap-1 font-mono text-xs text-muted sm:flex print:hidden">
        <span id="breadcrumb-label" className="sr-only">
          <T s="Breadcrumb" />
        </span>
        {items.map((b, i) => (
          <span key={i} className="inline-flex items-center gap-1">
            {i > 0 && <span aria-hidden className="text-border-strong">/</span>}
            {b.href ? (
              <Link href={b.href} className="hover:text-fg hover:underline">
                {b.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-fg">{b.label}</span>
            )}
          </span>
        ))}
      </nav>
    </>
  );
}
