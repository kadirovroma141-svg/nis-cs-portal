import type { Metadata } from "next";
import { IBM_Plex_Sans, JetBrains_Mono, Unbounded } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { THEME_COOKIE, parseTheme, themeAttribute } from "@/lib/theme";
import { getLocale, getT } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/client";
import { UsageTracker } from "@/components/usage-tracker";

// "Lab Notebook" type: wide geometric display, plain humanist text, code mono.
const heading = Unbounded({ variable: "--font-heading", subsets: ["latin", "cyrillic"] });
const body = IBM_Plex_Sans({ variable: "--font-body", subsets: ["latin", "cyrillic"] });
const code = JetBrains_Mono({ variable: "--font-code", subsets: ["latin", "cyrillic"] });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { default: "NIS Computer Science", template: "%s · NIS Computer Science" },
    description: t("Learning and exam preparation platform for NIS Computer Science & Informatics, Grades 7–12."),
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  const locale = await getLocale();
  const t = await getT();
  return (
    <html
      lang={locale === "en" ? "en" : "ru"}
      data-theme={themeAttribute(theme)}
      className={`${heading.variable} ${body.variable} ${code.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var p = JSON.parse(localStorage.getItem('nis_hcd_preferences_v1') || '{}');
                var d = document.documentElement;
                if (p.fontScale && p.fontScale !== 'normal') d.dataset.fontScale = p.fontScale;
                if (p.highContrast) d.dataset.highContrast = 'true';
                if (p.reducedMotion) d.dataset.reducedMotion = 'true';
                if (p.dyslexicFont) d.dataset.dyslexicFont = 'true';
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:border-2 focus:border-ink focus:bg-surface focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-fg focus:shadow-md focus:outline-none"
        >
          {t("Skip to content")}
        </a>
        <I18nProvider locale={locale}>{children}</I18nProvider>
        <UsageTracker />
      </body>
    </html>
  );
}
