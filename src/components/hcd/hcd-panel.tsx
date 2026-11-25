"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sliders,
  Eye,
  Keyboard,
  MessageSquareHeart,
  X,
  Check,
  Star,
  Sparkles,
  ShieldCheck,
  Clock,
  Type,
  SunMoon,
  MoveHorizontal,
} from "@/components/icons";
import { useHcd, type FontScale, type UserFeedbackSubmission } from "@/lib/hcd";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n/client";

interface HcdPanelProps {
  open: boolean;
  onClose: () => void;
}

export function HcdPanel({ open, onClose }: HcdPanelProps) {
  const t = useT();
  const { prefs, updatePrefs } = useHcd();
  const [activeTab, setActiveTab] = useState<"ergonomics" | "keyboard" | "evaluation">("ergonomics");

  // Feedback form state
  const [rating, setRating] = useState<number>(5);
  const [category, setCategory] = useState<UserFeedbackSubmission["category"]>("ergonomics");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Focus trap / initial focus
  useEffect(() => {
    if (open) {
      modalRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setIsSubmitting(true);
    setFeedbackError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          category,
          comment: comment.trim(),
          url: typeof window !== "undefined" ? window.location.pathname : "",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setFeedbackSent(true);
      setTimeout(() => {
        setComment("");
        setFeedbackSent(false);
      }, 4000);
    } catch {
      // The comment stays in the field so it can be resent.
      setFeedbackError("Не удалось отправить отзыв. Проверьте соединение и попробуйте ещё раз.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hcd-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl outline-none max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Sliders className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 id="hcd-modal-title" className="text-lg font-semibold">
                {t("Человекоориентированный интерфейс (ISO 9241-210)")}
              </h2>
              <p className="text-xs text-muted">
                {t("Эргономика, доступность и пользовательская оценка платформы")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"
            aria-label={t("Закрыть окно")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-surface-2/50 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab("ergonomics")}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
              activeTab === "ergonomics"
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-fg",
            )}
          >
            <Eye className="h-4 w-4" />{" "}{t("Эргономика и зрение")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("keyboard")}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
              activeTab === "keyboard"
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-fg",
            )}
          >
            <Keyboard className="h-4 w-4" />{" "}{t("Горячие клавиши")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("evaluation")}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
              activeTab === "evaluation"
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-fg",
            )}
          >
            <MessageSquareHeart className="h-4 w-4" />{" "}{t("Оценка удобства (HCD)")}
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "ergonomics" && (
            <div className="space-y-6">
              {/* Font Scaling */}
              <div className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Type className="h-4 w-4 text-primary" />{" "}{t("Масштаб шрифта и читаемость")}
                    </h3>
                    <p className="text-xs text-muted mt-0.5">
                      {t("Настройка размера текста для удобного чтения без напряжения глаз (ISO 9241-171 §8.1)")}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  {(
                    [
                      { value: "normal", label: "Стандартный (100%)" },
                      { value: "medium", label: "Увеличенный (112%)" },
                      { value: "large", label: "Крупный (125%)" },
                    ] as { value: FontScale; label: string }[]
                  ).map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => updatePrefs({ fontScale: f.value })}
                      className={cn(
                        "flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                        prefs.fontScale === f.value
                          ? "border-primary bg-primary text-primary-fg shadow-xs"
                          : "border-border bg-surface-2 text-fg hover:border-primary/50",
                      )}
                    >
                      {t(f.label)}
                    </button>
                  ))}
                </div>
              </div>

              {/* High Contrast Mode */}
              <div className="rounded-xl border border-border bg-surface p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <SunMoon className="h-4 w-4 text-primary" />{" "}{t("Высокая контрастность (High Contrast)")}
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    {t("Усиленная контрастность текста и границ (соответствие WCAG AAA и ISO 9241-171 §8.4)")}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={prefs.highContrast}
                  onClick={() => updatePrefs({ highContrast: !prefs.highContrast })}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    prefs.highContrast ? "bg-primary" : "bg-muted/30",
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      prefs.highContrast ? "translate-x-5" : "translate-x-0",
                    )}
                  />
                </button>
              </div>

              {/* Reduced Motion */}
              <div className="rounded-xl border border-border bg-surface p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <MoveHorizontal className="h-4 w-4 text-primary" />{" "}{t("Уменьшение движения (Reduced Motion)")}
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    {t("Отключение анимаций и переходов для снижения зрительной утомляемости")}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={prefs.reducedMotion}
                  onClick={() => updatePrefs({ reducedMotion: !prefs.reducedMotion })}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    prefs.reducedMotion ? "bg-primary" : "bg-muted/30",
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      prefs.reducedMotion ? "translate-x-5" : "translate-x-0",
                    )}
                  />
                </button>
              </div>

              {/* Dyslexia / Legibility */}
              <div className="rounded-xl border border-border bg-surface p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />{" "}{t("Режим повышенной читаемости")}
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    {t("Увеличенные интервалы между буквами и строками для комфортного восприятия")}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={prefs.dyslexicFont}
                  onClick={() => updatePrefs({ dyslexicFont: !prefs.dyslexicFont })}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    prefs.dyslexicFont ? "bg-primary" : "bg-muted/30",
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      prefs.dyslexicFont ? "translate-x-5" : "translate-x-0",
                    )}
                  />
                </button>
              </div>

              {/* Rest Break Reminder (20-20-20 Rule) */}
              <div className="rounded-xl border border-border bg-surface p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />{" "}{t("Напоминание об отдыхе (Правило 20-20-20)")}
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    {t("Каждые 20 минут напоминать сделать 20-секундную паузу для защиты зрения (эргономика NIS)")}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={prefs.restReminder}
                  onClick={() => updatePrefs({ restReminder: !prefs.restReminder })}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    prefs.restReminder ? "bg-primary" : "bg-muted/30",
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      prefs.restReminder ? "translate-x-5" : "translate-x-0",
                    )}
                  />
                </button>
              </div>
            </div>
          )}

          {activeTab === "keyboard" && (
            <div className="space-y-4">
              <p className="text-sm text-muted">
                {t("Платформа полностью поддерживает управление с клавиатуры в соответствии с требованиями ISO 9241-110 (§5.3 «Управляемость системы») и ISO 9241-171:")}
              </p>
              <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                {[
                  { key: "?", desc: "Открыть панель эргономики и доступности (HCD)" },
                  { key: "/", desc: "Быстрый переход к поисковой строке" },
                  { key: "Esc", desc: "Закрыть текущее модальное окно или подсказку" },
                  { key: "Tab", desc: "Переход к следующему интерактивному элементу" },
                  { key: "Shift + Tab", desc: "Переход к предыдущему интерактивному элементу" },
                  { key: "Enter / Space", desc: "Активация выбранной кнопки или ссылки" },
                  { key: "← / →", desc: "Переход между вопросами во время экзамена и практики" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-3.5 bg-surface hover:bg-surface-2/40">
                    <span className="text-sm font-medium">{item.desc}</span>
                    <kbd className="rounded-md border border-border bg-surface-2 px-2.5 py-1 font-mono text-xs font-semibold shadow-xs">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "evaluation" && (
            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              <div>
                <p className="text-sm text-muted">
                  {t("Согласно стандарту")}{" "}<strong>{t("ISO 9241-210 (п. 4.2 и 5.5)")}</strong>{t(", проектирование базируется на постоянной обратной связи от пользователей. Оцените удобство системы:")}
                </p>
              </div>

              {/* Rating 1-5 */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                  {t("Общая оценка удобства (System Usability)")}
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg border text-base font-bold transition-transform hover:scale-105",
                        rating >= star
                          ? "border-warning bg-warning-soft text-warning"
                          : "border-border bg-surface text-muted",
                      )}
                    >
                      <Star className={cn("h-5 w-5", rating >= star && "fill-warning")} />
                    </button>
                  ))}
                  <span className="ml-2 flex items-center text-xs font-medium text-muted">
                    {rating === 5 ? t("Отлично (Очень удобно)") : rating === 4 ? t("Хорошо") : rating === 3 ? t("Удовлетворительно") : t("Требует доработки")}
                  </span>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                  {t("Категория обратной связи")}
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[
                    { value: "ergonomics", label: "Интерфейс и эргономика" },
                    { value: "clarity", label: "Понятность заданий" },
                    { value: "accessibility", label: "Доступность / шрифты" },
                    { value: "suggestion", label: "Идея / предложение" },
                    { value: "bug", label: "Замечена ошибка" },
                  ].map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCategory(c.value as UserFeedbackSubmission["category"])}
                      className={cn(
                        "rounded-lg border p-2 text-left text-xs font-medium transition-colors",
                        category === c.value
                          ? "border-primary bg-primary text-primary-fg"
                          : "border-border bg-surface-2 text-fg hover:border-primary/50",
                      )}
                    >
                      {t(c.label)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label htmlFor="hcd-comment" className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                  {t("Ваш отзыв или предложение")}
                </label>
                <textarea
                  id="hcd-comment"
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t("Опишите, что показалось удобным, а что вызвало затруднение или усталость...")}
                  className="w-full rounded-lg border border-border bg-surface-2 p-3 text-sm placeholder:text-muted focus:border-primary focus:bg-surface focus:outline-none"
                  required
                />
              </div>

              {feedbackError && (
                <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">{feedbackError}</p>
              )}

              {feedbackSent && (
                <div className="flex items-center gap-2 rounded-lg bg-success-soft p-3 text-sm text-success">
                  <Check className="h-4 w-4" />{" "}{t("Спасибо! Ваш отзыв учтен в рамках человекоориентированного проектирования.")}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isSubmitting || !comment.trim()}>
                  {isSubmitting ? t("Отправка...") : t("Отправить отзыв (HCD)")}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-surface-2/30 px-6 py-3 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-success" />{" "}{t("Соответствие стандарту ISO 9241-210:2019")}
          </span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t("Закрыть")}
          </Button>
        </div>
      </div>
    </div>
  );
}
