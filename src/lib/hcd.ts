"use client";

import { useCallback, useSyncExternalStore } from "react";

export type FontScale = "normal" | "medium" | "large";

export interface HcdPreferences {
  fontScale: FontScale;
  highContrast: boolean;
  reducedMotion: boolean;
  dyslexicFont: boolean;
  restReminder: boolean;
}

export const DEFAULT_HCD_PREFS: HcdPreferences = {
  fontScale: "normal",
  highContrast: false,
  reducedMotion: false,
  dyslexicFont: false,
  restReminder: true,
};

const STORAGE_KEY = "nis_hcd_preferences_v1";
const EVENT_NAME = "hcd-prefs-change";

// useSyncExternalStore requires getSnapshot to return the SAME reference while
// the underlying data is unchanged, so the parsed object is cached by raw string.
let cachedRaw: string | null = null;
let cachedPrefs: HcdPreferences = DEFAULT_HCD_PREFS;

export function readStoredPrefs(): HcdPreferences {
  if (typeof window === "undefined") return DEFAULT_HCD_PREFS;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return DEFAULT_HCD_PREFS;
  }
  if (raw === cachedRaw) return cachedPrefs;
  cachedRaw = raw;
  if (!raw) {
    cachedPrefs = DEFAULT_HCD_PREFS;
    return cachedPrefs;
  }
  try {
    const parsed = JSON.parse(raw);
    cachedPrefs = {
      fontScale: parsed.fontScale === "medium" || parsed.fontScale === "large" ? parsed.fontScale : "normal",
      highContrast: Boolean(parsed.highContrast),
      reducedMotion: Boolean(parsed.reducedMotion),
      dyslexicFont: Boolean(parsed.dyslexicFont),
      restReminder: parsed.restReminder !== undefined ? Boolean(parsed.restReminder) : true,
    };
  } catch {
    cachedPrefs = DEFAULT_HCD_PREFS;
  }
  return cachedPrefs;
}

export function applyPrefsToDom(prefs: HcdPreferences) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (prefs.fontScale !== "normal") {
    root.dataset.fontScale = prefs.fontScale;
  } else {
    delete root.dataset.fontScale;
  }

  if (prefs.highContrast) {
    root.dataset.highContrast = "true";
  } else {
    delete root.dataset.highContrast;
  }

  if (prefs.reducedMotion) {
    root.dataset.reducedMotion = "true";
  } else {
    delete root.dataset.reducedMotion;
  }

  if (prefs.dyslexicFont) {
    root.dataset.dyslexicFont = "true";
  } else {
    delete root.dataset.dyslexicFont;
  }
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT_NAME, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT_NAME, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useHcd() {
  const prefs = useSyncExternalStore(subscribe, readStoredPrefs, () => DEFAULT_HCD_PREFS);

  const updatePrefs = useCallback((updates: Partial<HcdPreferences>) => {
    const current = readStoredPrefs();
    const next: HcdPreferences = { ...current, ...updates };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable
    }
    applyPrefsToDom(next);
    window.dispatchEvent(new Event(EVENT_NAME));
  }, []);

  return { prefs, updatePrefs };
}

export interface UserFeedbackSubmission {
  rating: number; // 1 to 5 (System Usability Scale metric)
  category: "ergonomics" | "clarity" | "accessibility" | "suggestion" | "bug";
  comment: string;
  url?: string;
  userAgent?: string;
}
