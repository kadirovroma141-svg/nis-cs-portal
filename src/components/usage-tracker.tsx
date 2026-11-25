"use client";
import { useEffect } from "react";
import { getBrowserClient } from "@/lib/supabase/client";

const TICK_MS = 60_000;
/** A visible tab counts as in use while the user acted within this window. */
const IDLE_MS = 10 * 60_000;

/**
 * Counts time on the site: once a minute, if the tab is visible and the user
 * acted recently (or is working inside an embedded app or slide deck), adds a
 * minute to today's total via `ping_usage()`. Renders nothing.
 */
export function UsageTracker() {
  useEffect(() => {
    let last = Date.now();
    const mark = () => {
      last = Date.now();
    };
    const events = ["pointerdown", "pointermove", "keydown", "wheel", "scroll", "touchstart"] as const;
    for (const e of events) window.addEventListener(e, mark, { passive: true, capture: true });
    document.addEventListener("visibilitychange", mark);

    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      // Clicks inside an iframe (slides, mini-apps) never reach this window.
      const inFrame = document.activeElement?.tagName === "IFRAME" && document.hasFocus();
      if (!inFrame && Date.now() - last > IDLE_MS) return;
      try {
        const supabase = getBrowserClient();
        const { data } = await supabase.auth.getSession();
        if (!data.session) return;
        await supabase.rpc("ping_usage");
      } catch {
        // Offline or signed out: skip this minute.
      }
    };
    const id = window.setInterval(tick, TICK_MS);
    return () => {
      window.clearInterval(id);
      for (const e of events) window.removeEventListener(e, mark, { capture: true });
      document.removeEventListener("visibilitychange", mark);
    };
  }, []);
  return null;
}
