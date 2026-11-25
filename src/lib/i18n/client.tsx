"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { makeT, type Locale, type T } from "./index";

const Ctx = createContext<{ locale: Locale; t: T }>({ locale: "ru", t: makeT("ru") });

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(() => ({ locale, t: makeT(locale) }), [locale]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useT = () => useContext(Ctx).t;
export const useLocale = () => useContext(Ctx).locale;
