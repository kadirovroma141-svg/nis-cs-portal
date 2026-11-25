"use client";
import { useT } from "@/lib/i18n/client";
import type { TVars } from "@/lib/i18n";

/** Translated UI phrase for places that cannot await getT() (sync/shared components). */
export function T({ s, vars }: { s: string; vars?: TVars }) {
  return <>{useT()(s, vars)}</>;
}
