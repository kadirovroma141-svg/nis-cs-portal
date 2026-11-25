"use client";
import { useTransition } from "react";
import { LOCALES } from "@/lib/i18n";
import { switchLocale } from "@/lib/i18n/actions";
import { useLocale, useT } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";

/** RU | EN toggle. Saves to a cookie (and the profile when signed in), then re-renders. */
export function LocaleSwitch({ className }: { className?: string }) {
  const locale = useLocale() === "en" ? "en" : "ru";
  const t = useT();
  const [pending, start] = useTransition();
  return (
    <div
      role="radiogroup"
      aria-label={t("Interface language")}
      className={cn("inline-flex h-9 items-stretch rounded-md border-[1.5px] border-ink p-0.5 font-mono text-xs font-bold", pending && "opacity-60", className)}
    >
      {LOCALES.map((l) => {
        const active = l.value === locale;
        return (
          <button
            key={l.value}
            type="button"
            role="radio"
            aria-checked={active}
            lang={l.value}
            title={l.label}
            disabled={pending}
            onClick={() => {
              if (active) return;
              const fd = new FormData();
              fd.set("locale", l.value);
              start(() => switchLocale(fd));
            }}
            className={cn("rounded-sm px-2 transition-colors", active ? "bg-ink text-background" : "text-muted hover:text-fg")}
          >
            {l.short}
          </button>
        );
      })}
    </div>
  );
}
