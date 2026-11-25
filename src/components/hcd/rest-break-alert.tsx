"use client";

import { useEffect, useState } from "react";
import { Eye, X, Check } from "@/components/icons";
import { useHcd } from "@/lib/hcd";
import { useT } from "@/lib/i18n/client";

const TWENTY_MINUTES_MS = 20 * 60 * 1000;
const TEN_MINUTES_MS = 10 * 60 * 1000;

export function RestBreakAlert() {
  const t = useT();
  const { prefs } = useHcd();
  const [showAlert, setShowAlert] = useState(false);
  // Each dismiss/snooze bumps `cycle`, which re-arms a single timer below.
  const [cycle, setCycle] = useState({ delay: TWENTY_MINUTES_MS, n: 0 });

  useEffect(() => {
    if (!prefs.restReminder) return;
    const timer = setTimeout(() => setShowAlert(true), cycle.delay);
    return () => clearTimeout(timer);
  }, [prefs.restReminder, cycle]);

  const handleDismiss = () => {
    setShowAlert(false);
    // Schedule next reminder in 20 minutes
    setCycle((c) => ({ delay: TWENTY_MINUTES_MS, n: c.n + 1 }));
  };

  const handleSnooze = () => {
    setShowAlert(false);
    // Snooze for 10 minutes
    setCycle((c) => ({ delay: TEN_MINUTES_MS, n: c.n + 1 }));
  };

  if (!showAlert || !prefs.restReminder) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 flex max-w-sm flex-col gap-2 rounded-2xl border border-primary/20 bg-surface p-4 shadow-2xl ring-1 ring-border animate-in fade-in slide-in-from-bottom-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Eye className="h-5 w-5" aria-hidden />
        </span>
        <div className="flex-1">
          <h4 className="text-sm font-semibold">{t("Эргономическая пауза (20-20-20)")}</h4>
          <p className="mt-1 text-xs text-muted leading-relaxed">
            {t("Вы непрерывно работаете за экраном 20 минут. Согласно стандарту эргономики, переведите взгляд на удаленный объект (на 5–6 метров) на 20 секунд для отдыха глазных мышц.")}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-muted hover:text-fg"
          aria-label={t("Закрыть уведомление")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleSnooze}
          className="rounded-lg px-2.5 py-1 text-xs font-medium text-muted hover:bg-surface-2"
        >
          {t("Напомнить через 10 мин")}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg hover:bg-primary-hover shadow-xs"
        >
          <Check className="h-3.5 w-3.5" />{" "}{t("Сделал паузу")}
        </button>
      </div>
    </div>
  );
}
