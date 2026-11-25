import type { ReactNode } from "react";
import { ThemeCycleButton } from "@/components/theme-toggle";
import { LocaleSwitch } from "@/components/locale-switch";
import { getT } from "@/lib/i18n/server";

/** Sign-in / first password: an ink "cover" of the notebook beside the form page. */
export default async function AuthLayout({ children }: { children: ReactNode }) {
  const t = await getT();
  const points = [
    { k: "01", text: t("Theory, practice and topic exams for grades 7–12") },
    { k: "02", text: t("Past papers and mock exams with marking") },
    { k: "03", text: t("Progress by learning objective") },
  ];
  return (
    <main id="main" className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <section className="relative flex flex-col justify-between overflow-hidden border-b-2 border-ink bg-cover px-6 py-8 text-cover-fg sm:px-10 lg:border-b-0 lg:border-r-2 lg:py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(var(--cover-fg)_1px,transparent_1px),linear-gradient(90deg,var(--cover-fg)_1px,transparent_1px)] bg-[size:28px_28px] opacity-[0.07]"
        />
        <div className="relative flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-11 w-11 items-center justify-center rounded-md border-2 border-cover-fg bg-accent font-mono text-base font-bold text-accent-fg"
          >
            &gt;_
          </span>
          <span className="leading-none">
            <span className="block font-display text-lg font-semibold">NIS·CS</span>
            <span className="label-mono mt-1 block opacity-70">{t("Computer Science · Grades 7–12")}</span>
          </span>
        </div>

        <div className="relative my-10 max-w-xl lg:my-0">
          <p className="label-mono mb-4 text-cover-accent">{t("Exam preparation platform")}</p>
          <p className="font-display text-[1.7rem] font-semibold leading-[1.15] sm:text-4xl">
            {t("Learn it. Practise it. Pass the exam.")}
          </p>
          <ul className="mt-8 hidden space-y-3 sm:block">
            {points.map((p) => (
              <li key={p.k} className="flex items-baseline gap-4 border-t border-dashed border-cover-fg/25 pt-3">
                <span className="font-mono text-xs text-cover-accent">{p.k}</span>
                <span className="text-sm opacity-90">{p.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="label-mono relative hidden opacity-60 lg:block">Nazarbayev Intellectual Schools</p>
      </section>

      <section className="relative flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-end gap-1">
          <LocaleSwitch />
          <ThemeCycleButton />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
      </section>
    </main>
  );
}
