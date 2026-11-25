"use client";
import { Monitor, Moon, Sun } from "@/components/icons";
import { useTheme } from "@/lib/use-theme";
import type { Theme } from "@/lib/theme";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n/client";

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

/** Compact icon button for the top bar: cycles light → dark → system. */
export function ThemeCycleButton() {
  const { theme, setTheme } = useTheme();
  const t = useT();
  const i = OPTIONS.findIndex((o) => o.value === theme);
  const current = OPTIONS[i] ?? OPTIONS[2];
  const next = OPTIONS[(i + 1) % OPTIONS.length];
  return (
    <button
      type="button"
      onClick={() => setTheme(next.value)}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-fg"
      aria-label={t("Theme: {current}. Switch to {next}", { current: t(current.label), next: t(next.label) })}
      title={t("Theme: {current}", { current: t(current.label) })}
    >
      <current.Icon className="h-5 w-5" />
    </button>
  );
}

/** Segmented control for the profile page. */
export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const t = useT();
  return (
    <div className="inline-flex rounded-md border-[1.5px] border-ink p-0.5" role="radiogroup" aria-label={t("Theme")}>
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          onClick={() => setTheme(value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-semibold transition-colors",
            theme === value ? "bg-ink text-background" : "text-muted hover:text-fg",
          )}
        >
          <Icon className="h-4 w-4" /> {t(label)}
        </button>
      ))}
    </div>
  );
}
