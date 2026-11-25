"use client";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "@/components/icons";
import { useT } from "@/lib/i18n/client";
import { NavLinks } from "./nav-links";
import type { NavGroup } from "./nav";

/** Below `lg`: a full-height sheet that drops from the masthead. */
export function MobileNav({ groups, brand, footer }: { groups: NavGroup[]; brand: React.ReactNode; footer?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const t = useT();

  // While open: Escape closes, the page behind does not scroll, focus starts inside.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="inline-flex h-9 items-center gap-1.5 rounded-md border-[1.5px] border-ink px-2.5 font-mono text-xs font-bold uppercase lg:hidden"
        aria-label={t("Open navigation")}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu className="h-4 w-4" />
        <span className="hidden sm:inline">{t("Menu")}</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background lg:hidden" role="dialog" aria-modal="true" aria-label={t("Navigation")}>
          <div className="flex h-14 shrink-0 items-center justify-between border-b-2 border-ink bg-surface px-4">
            {brand}
            <button
              ref={closeRef}
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border-[1.5px] border-ink"
              aria-label={t("Close navigation")}
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <NavLinks groups={groups} onNavigate={() => setOpen(false)} />
          </div>
          {footer && (
            <div className="border-t-2 border-ink bg-surface px-4 py-3" onClick={() => setOpen(false)}>
              {footer}
            </div>
          )}
        </div>
      )}
    </>
  );
}
