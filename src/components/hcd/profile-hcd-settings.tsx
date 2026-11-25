"use client";

import { useHcd, type FontScale } from "@/lib/hcd";
import { cn } from "@/lib/cn";
import { Type, SunMoon, MoveHorizontal, Sparkles, Clock } from "@/components/icons";
import { useT } from "@/lib/i18n/client";

export function ProfileHcdSettings() {
  const t = useT();
  const { prefs, updatePrefs } = useHcd();

  return (
    <div className="space-y-4">
      {/* Font scale */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5 mb-1.5">
          <Type className="h-3.5 w-3.5 text-primary" />{" "}{t("Масштаб шрифта")}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { value: "normal", label: "100%" },
              { value: "medium", label: "112%" },
              { value: "large", label: "125%" },
            ] as { value: FontScale; label: string }[]
          ).map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => updatePrefs({ fontScale: item.value })}
              className={cn(
                "rounded-lg border px-3 py-2 text-xs font-medium transition-colors text-center",
                prefs.fontScale === item.value
                  ? "border-primary bg-primary text-primary-fg shadow-xs"
                  : "border-border bg-surface-2 text-fg hover:border-primary/50",
              )}
            >
              {t(item.label)}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-2.5 pt-1">
        {/* High contrast */}
        <div className="flex items-center justify-between rounded-lg border border-border p-2.5 bg-surface-2/40">
          <div className="pr-2">
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <SunMoon className="h-3.5 w-3.5 text-primary" />{" "}{t("Высокая контрастность")}
            </span>
            <span className="text-[11px] text-muted block">
              {t("Соответствие WCAG AAA и ISO 9241-171")}
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={prefs.highContrast}
            onClick={() => updatePrefs({ highContrast: !prefs.highContrast })}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
              prefs.highContrast ? "bg-primary" : "bg-muted/30",
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                prefs.highContrast ? "translate-x-4" : "translate-x-0",
              )}
            />
          </button>
        </div>

        {/* Reduced motion */}
        <div className="flex items-center justify-between rounded-lg border border-border p-2.5 bg-surface-2/40">
          <div className="pr-2">
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <MoveHorizontal className="h-3.5 w-3.5 text-primary" />{" "}{t("Уменьшение анимаций")}
            </span>
            <span className="text-[11px] text-muted block">
              {t("Снижение зрительной утомляемости")}
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={prefs.reducedMotion}
            onClick={() => updatePrefs({ reducedMotion: !prefs.reducedMotion })}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
              prefs.reducedMotion ? "bg-primary" : "bg-muted/30",
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                prefs.reducedMotion ? "translate-x-4" : "translate-x-0",
              )}
            />
          </button>
        </div>

        {/* Dyslexic / legibility */}
        <div className="flex items-center justify-between rounded-lg border border-border p-2.5 bg-surface-2/40">
          <div className="pr-2">
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />{" "}{t("Повышенная читаемость")}
            </span>
            <span className="text-[11px] text-muted block">
              {t("Увеличенные межбуквенные и межстрочные интервалы")}
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={prefs.dyslexicFont}
            onClick={() => updatePrefs({ dyslexicFont: !prefs.dyslexicFont })}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
              prefs.dyslexicFont ? "bg-primary" : "bg-muted/30",
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                prefs.dyslexicFont ? "translate-x-4" : "translate-x-0",
              )}
            />
          </button>
        </div>

        {/* 20-20-20 rule timer */}
        <div className="flex items-center justify-between rounded-lg border border-border p-2.5 bg-surface-2/40">
          <div className="pr-2">
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />{" "}{t("Таймер отдыха (Правило 20-20-20)")}
            </span>
            <span className="text-[11px] text-muted block">
              {t("Напоминание о 20-секундной гимнастике для глаз каждые 20 мин")}
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={prefs.restReminder}
            onClick={() => updatePrefs({ restReminder: !prefs.restReminder })}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
              prefs.restReminder ? "bg-primary" : "bg-muted/30",
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                prefs.restReminder ? "translate-x-4" : "translate-x-0",
              )}
            />
          </button>
        </div>
      </div>
      <p className="text-[11px] text-muted">
        {t("Настройки эргономики сохраняются локально в этом браузере в соответствии с международным стандартом ISO 9241-210.")}
      </p>
    </div>
  );
}
