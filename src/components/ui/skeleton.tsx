import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { T } from "./t";

/** A single placeholder bar. Pulses unless reduced motion is on (globals.css). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-sm bg-[repeating-linear-gradient(135deg,var(--surface-2)_0_7px,var(--background)_7px_14px)]", className)} />;
}

/** Wraps a route-level fallback so assistive tech announces the pending page. */
export function SkeletonPage({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="space-y-6">
      <span className="sr-only">{label ?? <T s="Loading…" />}</span>
      {children}
    </div>
  );
}

export function PageHeaderSkeleton({ breadcrumbs = false, actions = false }: { breadcrumbs?: boolean; actions?: boolean }) {
  return (
    <div className="space-y-2">
      {breadcrumbs && <Skeleton className="h-4 w-56" />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64 max-w-[70vw]" />
          <Skeleton className="h-4 w-96 max-w-[80vw]" />
        </div>
        {actions && <Skeleton className="h-9 w-32" />}
      </div>
    </div>
  );
}

export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-3 rounded-xl border border-border bg-surface p-5 shadow-sm">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface shadow-sm", className)}>
      <div className="border-b border-border px-5 py-4">
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="space-y-3 px-5 py-4">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} className={cn("h-4", i === lines - 1 ? "w-2/3" : "w-full")} />
        ))}
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-3 rounded-xl border border-border bg-surface p-5 shadow-sm">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 8, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="flex gap-4 border-b border-border bg-surface-2/50 px-5 py-3">
        {Array.from({ length: cols }, (_, c) => (
          <Skeleton key={c} className="h-4 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex gap-4 px-5 py-3.5">
            {Array.from({ length: cols }, (_, c) => (
              <Skeleton key={c} className={cn("h-4 flex-1", c === 0 && "max-w-[40%]")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TabsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-3 border-b border-border pb-2.5">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-5 w-20" />
      ))}
    </div>
  );
}

/* Route presets: keep loading.tsx files one line each. */

export function DashboardSkeleton() {
  return (
    <SkeletonPage>
      <PageHeaderSkeleton />
      <StatsSkeleton />
      <div className="grid gap-6 lg:grid-cols-3">
        <CardSkeleton lines={5} className="lg:col-span-2" />
        <CardSkeleton lines={4} />
      </div>
    </SkeletonPage>
  );
}

export function ListPageSkeleton({ actions = true, rows = 8, cols = 4 }: { actions?: boolean; rows?: number; cols?: number }) {
  return (
    <SkeletonPage>
      <PageHeaderSkeleton actions={actions} />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <TableSkeleton rows={rows} cols={cols} />
    </SkeletonPage>
  );
}

export function GridPageSkeleton({ count = 6, toggle = false }: { count?: number; toggle?: boolean }) {
  return (
    <SkeletonPage>
      <PageHeaderSkeleton />
      {toggle && <Skeleton className="h-10 w-72" />}
      <CardGridSkeleton count={count} />
    </SkeletonPage>
  );
}

export function DetailPageSkeleton() {
  return (
    <SkeletonPage>
      <PageHeaderSkeleton breadcrumbs actions />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <CardSkeleton lines={6} />
          <CardSkeleton lines={4} />
        </div>
        <CardSkeleton lines={5} />
      </div>
    </SkeletonPage>
  );
}

/** Content area only: used under layouts that already render the header (learn/[topic]). */
export function SectionSkeleton() {
  return (
    <SkeletonPage>
      <CardSkeleton lines={6} />
      <CardSkeleton lines={4} />
    </SkeletonPage>
  );
}
