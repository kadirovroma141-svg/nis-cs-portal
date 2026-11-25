import type { ReactNode } from "react";

/** Dashboard masthead: a dark "notebook cover" band with the role kicker, greeting and actions. */
export function DashboardHero({
  kicker,
  title,
  description,
  actions,
}: {
  kicker: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="relative mb-8 overflow-hidden rounded-xl border-2 border-ink bg-cover text-cover-fg shadow-[6px_6px_0_0_var(--accent)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(var(--cover-fg)_1px,transparent_1px),linear-gradient(90deg,var(--cover-fg)_1px,transparent_1px)] bg-[size:24px_24px] opacity-[0.06]"
      />
      <span aria-hidden className="pointer-events-none absolute -right-3 -top-6 select-none font-mono text-[7rem] font-bold leading-none opacity-[0.07]">
        {"{ }"}
      </span>
      <div className="relative flex flex-wrap items-end justify-between gap-4 px-5 py-6 sm:px-7">
        <div className="min-w-0">
          <p className="label-mono text-cover-accent">{kicker}</p>
          <h1 className="mt-2 text-2xl font-semibold leading-tight sm:text-[2rem]">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-sm opacity-80">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </section>
  );
}
