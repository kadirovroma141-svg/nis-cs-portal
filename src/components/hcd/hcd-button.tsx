"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal } from "@/components/icons";
import { applyPrefsToDom, readStoredPrefs } from "@/lib/hcd";
import { HcdPanel } from "./hcd-panel";
import { useT } from "@/lib/i18n/client";

export function HcdButton() {
  const [panelOpen, setPanelOpen] = useState(false);
  const t = useT();

  // Initialize DOM attributes on client mount
  useEffect(() => {
    applyPrefsToDom(readStoredPrefs());
  }, []);

  // Global hotkeys (? for HCD panel, / for search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable=true], .cm-editor")) {
        return;
      }

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setPanelOpen((prev) => !prev);
      } else if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        const searchInput = document.getElementById("global-search") as HTMLInputElement | null;
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setPanelOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-fg transition-colors"
        aria-label={t("Эргономика и доступность (ISO 9241-210). Нажмите '?' для справки")}
        title={t("Эргономика и доступность (ISO 9241-210) — нажмите '?'")}
      >
        <SlidersHorizontal className="h-5 w-5" />
      </button>

      <HcdPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </>
  );
}
