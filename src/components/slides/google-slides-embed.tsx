"use client";

import { useState, useRef } from "react";
import { ExternalLink, Maximize2, Minimize2, Presentation, Edit3, Check, AlertCircle, RefreshCw } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";

import { getTopicPresentations, type InteractiveLessonDeck } from "@/lib/presentations";

interface GoogleSlidesEmbedProps {
  topicSlug: string;
  topicTitle: string;
  initialSlidesUrl: string | null;
  presentations?: InteractiveLessonDeck[];
  canEdit?: boolean;
}

export function GoogleSlidesEmbed({
  topicSlug,
  topicTitle,
  initialSlidesUrl,
  presentations,
  canEdit = false,
}: GoogleSlidesEmbedProps) {
  const t = useT();
  const decks = presentations && presentations.length > 0 ? presentations : getTopicPresentations(topicSlug);
  const hasInteractive = decks.length > 0;

  const [slidesUrl, setSlidesUrl] = useState<string | null>(initialSlidesUrl);
  const [activeLessonIdx, setActiveLessonIdx] = useState(0);
  // Interactive HTML presentations always take priority; Google Slides stays secondary.
  const [showGoogleFallback, setShowGoogleFallback] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [inputUrl, setInputUrl] = useState(initialSlidesUrl || "");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const showingInteractive = hasInteractive && !showGoogleFallback;
  const activeLesson = showingInteractive ? decks[activeLessonIdx] ?? decks[0] : null;

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;
    setSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/topics/${topicSlug}/slides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slidesUrl: inputUrl.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Не удалось сохранить презентацию");
      }

      setSlidesUrl(data.slidesUrl);
      setIsEditing(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`group relative flex flex-col rounded-2xl border border-border bg-surface shadow-sm overflow-hidden transition-all ${
        isFullscreen ? "h-screen w-screen rounded-none p-4 bg-background" : ""
      }`}
    >
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-2/60 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <Presentation className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-fg flex items-center gap-2">
              {showingInteractive ? t("Интерактивные презентации") : t("Google Slides")}
              <span className="hidden sm:inline-block rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-mono text-muted">
                {showingInteractive ? `${decks.length} ур.` : t("16:9 HD")}
              </span>
            </h3>
            <p className="text-xs text-muted truncate max-w-full sm:max-w-md">
              {activeLesson ? `Урок ${activeLesson.lesson}: ${activeLesson.title}` : topicTitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeLesson ? (
            <>
              <a
                href={activeLesson.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-fg hover:bg-surface-2 transition-colors"
                title="Открыть презентацию в новой вкладке"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Новая вкладка</span>
              </a>

              <button
                type="button"
                onClick={toggleFullscreen}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-fg hover:bg-surface-2 transition-colors"
                title={isFullscreen ? t("Выйти из полноэкранного режима") : t("Во весь экран")}
              >
                {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{isFullscreen ? t("Свернуть") : t("Во весь экран")}</span>
              </button>

              {slidesUrl && (
                <button
                  type="button"
                  onClick={() => setShowGoogleFallback(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-muted hover:text-fg hover:bg-surface-2 transition-colors cursor-pointer"
                  title="Переключиться на прикреплённую презентацию Google Slides"
                >
                  <span>Google Slides</span>
                </button>
              )}
            </>
          ) : (
            <>
              {hasInteractive && (
                <button
                  type="button"
                  onClick={() => setShowGoogleFallback(false)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary text-primary-fg px-2.5 py-1.5 text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <span>← Интерактивные уроки ({decks.length})</span>
                </button>
              )}

              {slidesUrl && (
                <>
                  <a
                    href={slidesUrl.replace("/embed", "/edit")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-fg hover:bg-surface-2 transition-colors"
                    title={t("Открыть в Google Презентациях")}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{t("Google Диск")}</span>
                  </a>

                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-fg hover:bg-surface-2 transition-colors"
                    title={isFullscreen ? t("Выйти из полноэкранного режима") : t("Во весь экран")}
                  >
                    {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">{isFullscreen ? t("Свернуть") : t("Во весь экран")}</span>
                  </button>
                </>
              )}

              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>{slidesUrl ? t("Изменить ссылку") : t("Прикрепить презентацию")}</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Lesson Switcher Bar for Interactive HTML Presentations */}
      {showingInteractive && (
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border bg-surface px-4 py-2">
          {decks.map((deck, idx) => {
            const active = idx === activeLessonIdx;
            return (
              <button
                key={deck.lesson}
                type="button"
                onClick={() => setActiveLessonIdx(idx)}
                title={`Урок ${deck.lesson}: ${deck.title}`}
                className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  active
                    ? "border-primary bg-primary text-primary-fg"
                    : "border-border bg-surface-2/70 text-fg hover:border-primary/50"
                }`}
              >
                Урок {deck.lesson}
              </button>
            );
          })}
        </div>
      )}

      {/* Inline Edit Form for Teachers/Admins */}
      {isEditing && (
        <form onSubmit={handleSave} className="border-b border-border bg-surface-2/90 p-4 space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-fg">
              {t("Ссылка на Google Slides (презентацию) для этой темы:")}
            </label>
            <p className="text-xs text-muted">
              {t("Вставьте обычную ссылку из браузера, ссылку «Опубликовать в интернете» или ID презентации.")}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder={t("https://docs.google.com/presentation/d/.../edit?usp=sharing")}
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-primary focus:outline-none"
              required
            />
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={saving} size="sm">
                {saving ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    {t("Сохранение...")}
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1.5" />
                    {t("Сохранить")}
                  </>
                )}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                {t("Отмена")}
              </Button>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-1.5 text-xs text-danger">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </form>
      )}

      {/* Main Content Area */}
      <div className={`relative w-full ${isFullscreen ? "flex-1" : activeLesson ? "h-[740px]" : "aspect-video"}`}>
        {activeLesson ? (
          <iframe
            key={activeLesson.url}
            src={activeLesson.url}
            title={`Урок ${activeLesson.lesson}: ${activeLesson.title}`}
            allow="fullscreen; autoplay; clipboard-read; clipboard-write"
            className="h-full w-full border-0 bg-background"
          />
        ) : slidesUrl ? (
          <iframe
            src={slidesUrl}
            title={t("Презентация: {topicTitle}", { topicTitle })}
            allow="fullscreen; autoplay"
            className="h-full w-full border-0 bg-black"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center bg-surface-2/30">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 border border-border text-muted mb-3">
              <Presentation className="h-7 w-7 text-primary/70" />
            </div>
            <h4 className="text-base font-semibold text-fg">{t("Презентация еще не прикреплена")}</h4>
            <p className="mt-1 text-sm text-muted max-w-md">
              {t("Для этой темы пока не добавлена Google Slides презентация.")}
              {canEdit && t(" Нажмите кнопку выше, чтобы прикрепить презентацию урока.")}
            </p>
            {canEdit && !isEditing && (
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => setIsEditing(true)}
              >
                <Presentation className="h-4 w-4 mr-1.5" />
                {t("Прикрепить Google Slides")}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
