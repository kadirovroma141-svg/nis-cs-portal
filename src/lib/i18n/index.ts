// UI dictionary. Two layers:
//  - keyed `nav.*` / `common.*` (below) for the shell;
//  - phrase catalogue (`./ru.ts`): every other UI string is written in English in
//    the code and wrapped in t("…"); ru.ts maps it to Russian. Missing → as written.
//    A few older screens are written in Russian; en.ts maps those phrases back.
// Lesson content (theory, questions, topic/objective names) is never translated.
// Add keys to `en` first — it defines the shape.
import { RU } from "./ru";
import { EN } from "./en";
const en = {
  nav: {
    dashboard: "Dashboard",
    learn: "Learn & Practice",
    papers: "Exam Papers",
    mocks: "Mock Exams",
    repeat: "Repeat",
    games: "Games",
    apps: "Apps",
    subd: "Mini DBMS",
    excel: "Mini Sheets",
    html: "Mini HTML",
    cpp: "Mini C++",
    csharp: "Mini C#",
    python: "Mini Python",
    sql: "Mini SQL",
    php: "Mini PHP",
    js: "Mini JS",
    summative: "Summative (SAU)",
    progress: "My Progress",
    profile: "Profile",
    classes: "Classes",
    students: "Students",
    assignments: "Assignments",
    visibility: "Topic Visibility",
    sessions: "Exam Sessions",
    questions: "Question Bank",
    results: "Results",
    analytics: "Analytics",
    overview: "Overview",
    users: "Users",
    curriculum: "Curriculum",
    settings: "System Settings",
    audit: "Audit Logs",
    generator: "AI Studio",
    teaching: "Teaching",
    administration: "Administration",
    tasks: "Assignments & SAU",
    assessment: "Assessment",
    prep: "SAU Prep Studio",
    content: "Content",
    materials: "Learning materials",
    insights: "Results & Analytics",
    people: "Users & Classes",
    system: "System",
  },
  common: {
    search: "Search topics, LO codes, questions…",
    signOut: "Sign out",
    notifications: "Notifications",
    back: "Back",
  },
};

type Dict = typeof en;
type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

const ru: DeepPartial<Dict> = {
  nav: {
    dashboard: "Главная",
    learn: "Обучение и практика",
    papers: "Экзаменационные Papers",
    mocks: "Пробные экзамены",
    repeat: "Повторение",
    games: "Игры",
    apps: "Приложения",
    subd: "Мини-СУБД",
    excel: "Мини-Таблицы",
    html: "Мини-HTML",
    cpp: "Мини-C++",
    csharp: "Мини-C#",
    python: "Мини-Python",
    sql: "Мини-SQL",
    php: "Мини-PHP",
    js: "Мини-JS",
    summative: "Суммативное оценивание (СОР)",
    progress: "Мой прогресс",
    profile: "Профиль",
    classes: "Классы",
    students: "Ученики",
    assignments: "Задания",
    visibility: "Видимость тем",
    sessions: "Экзамены",
    questions: "Банк вопросов",
    results: "Результаты",
    analytics: "Аналитика",
    overview: "Обзор",
    users: "Пользователи",
    curriculum: "Программа",
    settings: "Настройки",
    audit: "Журнал аудита",
    generator: "ИИ Студия материалов",
    teaching: "Преподавание",
    administration: "Администрирование",
    tasks: "Задания и СОР/СОЧ",
    assessment: "Оценивание",
    prep: "Подготовка к СОР/СОЧ",
    content: "Контент",
    materials: "Учебные материалы",
    insights: "Результаты и аналитика",
    people: "Пользователи и классы",
    system: "Система",
  },
  common: { search: "Поиск тем, кодов LO, вопросов…", signOut: "Выйти", notifications: "Уведомления", back: "Назад" },
};

const kk: DeepPartial<Dict> = {
  nav: {
    dashboard: "Басты бет",
    learn: "Оқу және практика",
    papers: "Емтихан Papers",
    mocks: "Сынақ емтихандары",
    repeat: "Қайталау",
    games: "Ойындар",
    apps: "Қосымшалар",
    subd: "Мини-ДҚБЖ",
    excel: "Мини-Кестелер",
    html: "Мини-HTML",
    cpp: "Мини-C++",
    csharp: "Мини-C#",
    python: "Мини-Python",
    sql: "Мини-SQL",
    php: "Мини-PHP",
    js: "Мини-JS",
    summative: "Жиынтық бағалау (БЖБ)",
    progress: "Менің прогресім",
    profile: "Профиль",
    classes: "Сыныптар",
    students: "Оқушылар",
    assignments: "Тапсырмалар",
    visibility: "Тақырыптардың көрінуі",
    sessions: "Емтихандар",
    questions: "Сұрақтар банкі",
    results: "Нәтижелер",
    analytics: "Аналитика",
    overview: "Шолу",
    users: "Пайдаланушылар",
    curriculum: "Бағдарлама",
    settings: "Баптаулар",
    audit: "Аудит журналы",
    generator: "ЖИ Материалдар студиясы",
    teaching: "Оқыту",
    administration: "Әкімшілік",
    tasks: "Тапсырмалар және БЖБ/ТЖБ",
    assessment: "Бағалау",
    prep: "БЖБ/ТЖБ дайындығы",
    content: "Мазмұн",
    materials: "Оқу материалдары",
    insights: "Нәтижелер мен аналитика",
    people: "Пайдаланушылар мен сыныптар",
    system: "Жүйе",
  },
  common: { search: "Тақырып, LO коды, сұрақ іздеу…", signOut: "Шығу", notifications: "Хабарламалар", back: "Артқа" },
};

export type Locale = "en" | "ru" | "kk";
/** Languages offered in the switcher (kk stays valid in profiles, shown as ru). */
export const LOCALES: { value: Locale; label: string; short: string }[] = [
  { value: "ru", label: "Русский", short: "RU" },
  { value: "en", label: "English", short: "EN" },
];
export const LOCALE_COOKIE = "locale";
export const DEFAULT_LOCALE: Locale = "ru";

export function parseLocale(v: string | null | undefined): Locale | null {
  return v === "en" || v === "ru" || v === "kk" ? v : null;
}

export type TVars = Record<string, string | number | null | undefined>;
/** Translate an English UI phrase. `{name}` placeholders are filled from `vars`. */
export type T = ((text: string | null | undefined, vars?: TVars) => string) & { locale: Locale };

export function translate(locale: Locale | string | null | undefined, text: string | null | undefined, vars?: TVars): string {
  if (text == null) return "";
  const s = locale === "en" ? (EN[text] ?? text) : (RU[text] ?? text);
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k] ?? "") : m)) : s;
}

export function makeT(locale: Locale | string | null | undefined): T {
  const loc: Locale = parseLocale(locale ?? null) ?? DEFAULT_LOCALE;
  return Object.assign((text: string | null | undefined, vars?: TVars) => translate(loc, text, vars), { locale: loc });
}

function merge<T extends object>(base: T, over: DeepPartial<T> | undefined): T {
  if (!over) return base;
  const out = { ...base } as Record<string, unknown>;
  for (const [k, v] of Object.entries(over)) {
    const b = (base as Record<string, unknown>)[k];
    out[k] = v && typeof v === "object" && b && typeof b === "object" ? merge(b as object, v as object) : (v ?? b);
  }
  return out as T;
}

export function getDictionary(locale: string | null | undefined): Dict {
  if (locale === "ru") return merge(en, ru);
  if (locale === "kk") return merge(en, kk);
  if (locale !== "en") return merge(en, ru);
  return en;
}
export type { Dict };
