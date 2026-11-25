import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

// Building blocks of the repeat site: soft rounded panels and pill buttons,
// unlike the square "lab notebook" sheets of the main site.

export function Panel({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("rounded-[20px] border border-border bg-surface p-5 shadow-[0_1px_2px_var(--shadow-ink)] sm:p-6", className)} {...props} />;
}

type Tone = "primary" | "soft" | "plain" | "accent";
const tones: Record<Tone, string> = {
  primary: "bg-primary text-primary-fg hover:bg-primary-hover",
  accent: "bg-accent text-accent-fg hover:opacity-90",
  soft: "bg-primary-soft text-primary hover:bg-surface-2",
  plain: "border border-border bg-surface text-fg hover:bg-surface-2",
};

export function pill(tone: Tone = "primary", className?: string) {
  return cn(
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50",
    tones[tone],
    className,
  );
}

export function PillLink({ tone, className, ...props }: ComponentProps<typeof Link> & { tone?: Tone }) {
  return <Link className={pill(tone, className)} {...props} />;
}

export function PageTitle({ eyebrow, title, children }: { eyebrow?: ReactNode; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="space-y-1.5">
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</p>}
      <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{title}</h1>
      {children && <div className="max-w-2xl text-sm text-muted">{children}</div>}
    </header>
  );
}

/** Shown while the study_* tables are not in the database yet. */
export function NotReady({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Panel className="border-dashed text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted">{children}</p>
    </Panel>
  );
}
