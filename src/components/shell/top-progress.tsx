"use client";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

const urlKey = (pathname: string, search: string) => `${pathname}?${new URLSearchParams(search).toString()}`;

/** Gives up if a navigation never commits (offline, aborted, etc.). */
const MAX_PENDING_MS = 15_000;

/**
 * Thin bar at the top of the viewport that starts on any in-app link click and
 * finishes once the router commits the new URL. With loading.tsx the commit is
 * immediate, so the bar mostly bridges the gap until the skeleton appears.
 */
export function TopProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const current = urlKey(pathname, search);
  // URL the navigation started from; null when idle.
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const phase = startedAt === null ? "idle" : startedAt === current ? "loading" : "done";

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.href || a.hasAttribute("download") || (a.target && a.target !== "_self")) return;
      const to = new URL(a.href, location.href);
      if (to.origin !== location.origin) return;
      const from = urlKey(location.pathname, location.search);
      if (urlKey(to.pathname, to.search) === from) return; // same page or hash-only jump
      setStartedAt(from);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (phase === "idle") return;
    const t = setTimeout(() => setStartedAt(null), phase === "done" ? 350 : MAX_PENDING_MS);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-1 print:hidden">
      <div
        className={cn(
          "h-full origin-left bg-[repeating-linear-gradient(90deg,var(--accent)_0_12px,var(--primary)_12px_24px)]",
          phase === "idle" && "opacity-0",
          phase === "loading" && "top-progress-run",
          phase === "done" && "top-progress-done",
        )}
      />
    </div>
  );
}
