import type { ReactNode } from "react";
import { Inbox } from "@/components/icons";

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border-strong bg-surface/60 px-6 py-10 text-center">
      <span className="mb-1 flex h-12 w-12 -rotate-3 items-center justify-center rounded-md border-2 border-ink bg-accent-soft text-accent shadow-[3px_3px_0_0_var(--ink)]">
        <Inbox className="h-6 w-6" aria-hidden />
      </span>
      <p className="font-display text-sm font-semibold">{title}</p>
      {children && <div className="max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
