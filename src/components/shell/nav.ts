import type { Role } from "@/lib/db-types";
import type { Dict } from "@/lib/i18n";

export type IconName =
  | "dashboard" | "learn" | "papers" | "mocks" | "repeat" | "summative" | "progress" | "profile" | "classes" | "students"
  | "assignments" | "visibility" | "sessions" | "questions" | "results" | "analytics" | "users" | "curriculum"
  | "settings" | "audit";

/** A page inside a section, shown as a tab on top of the section's pages. */
export type NavChild = { href: string; label: string; match?: string[] };
/**
 * A sidebar entry. `match` lists extra path prefixes that belong to it (e.g.
 * /papers is the second view of /learn); `children` become section tabs.
 */
export type NavItem = { href: string; label: string; icon: IconName; match?: string[]; children?: NavChild[] };
export type NavGroup = { label?: string; items: NavItem[]; collapsible?: boolean };

/** `papers: false` — a grade 7–10 student: no Paper 1-2-3 mock exams. */
export function navFor(role: Role, t: Dict, { papers = true }: { papers?: boolean } = {}): NavGroup[] {
  const n = t.nav;
  const student: NavGroup = {
    items: [
      { href: "/student/dashboard", label: n.dashboard, icon: "dashboard" },
      { href: "/learn", label: n.learn, icon: "learn", match: ["/papers"] },
      {
        href: "/assignments",
        label: n.tasks,
        icon: "assignments",
        children: [
          { href: "/assignments", label: n.assignments },
          { href: "/summative", label: n.summative },
        ],
      },
      ...(papers ? [{ href: "/mock-exams", label: n.mocks, icon: "mocks" as const }] : []),
      { href: "/repeat", label: n.repeat, icon: "repeat" },
      { href: "/progress", label: n.progress, icon: "progress" },
    ],
  };
  const teaching: NavItem[] = [
    { href: "/teacher/dashboard", label: n.dashboard, icon: "dashboard" },
    {
      href: "/teacher/classes",
      label: n.classes,
      icon: "classes",
      children: [
        { href: "/teacher/classes", label: n.classes },
        { href: "/teacher/students", label: n.students },
        { href: "/teacher/topics", label: n.visibility },
      ],
    },
    {
      href: "/teacher/assignments",
      label: n.assessment,
      icon: "summative",
      children: [
        { href: "/teacher/assignments", label: n.assignments },
        { href: "/teacher/exams", label: n.sessions },
        { href: "/teacher/summative", label: n.summative },
      ],
    },
    {
      href: "/teacher/questions",
      label: n.content,
      icon: "questions",
      children: [
        { href: "/teacher/questions", label: n.questions },
        { href: "/learn", label: n.materials, match: ["/papers"] },
        { href: "/mock-exams", label: n.mocks },
      ],
    },
    {
      href: "/teacher/results",
      label: n.insights,
      icon: "analytics",
      children: [
        { href: "/teacher/results", label: n.results },
        { href: "/teacher/analytics", label: n.analytics },
      ],
    },
  ];

  const admin: NavItem[] = [
    { href: "/admin", label: n.overview, icon: "dashboard" },
    {
      href: "/admin/users",
      label: n.people,
      icon: "users",
      children: [
        { href: "/admin/users", label: n.users },
        { href: "/admin/classes", label: n.classes },
      ],
    },
    { href: "/admin/curriculum", label: n.curriculum, icon: "curriculum", match: ["/admin/topics", "/admin/theory"] },
    {
      href: "/admin/settings",
      label: n.system,
      icon: "settings",
      children: [
        { href: "/admin/settings", label: n.settings },
        { href: "/admin/audit", label: n.audit },
      ],
    },
  ];

  if (role === "student") return [student];
  if (role === "teacher") return [{ items: teaching }];
  return [
    { label: n.administration, items: admin },
    { label: n.teaching, items: teaching, collapsible: true },
  ];
}

/** Length of `prefix` if it covers `pathname`, else -1. Exact hits win ties. */
function score(pathname: string, prefix: string): number {
  if (pathname === prefix) return prefix.length + 0.5;
  return pathname.startsWith(`${prefix}/`) ? prefix.length : -1;
}

const best = (pathname: string, prefixes: string[]) => Math.max(-1, ...prefixes.map((p) => score(pathname, p)));

export type ResolvedNav = {
  item?: NavItem;
  child?: NavChild;
  /** True when the path is a section page itself (not a deeper detail page). */
  exact: boolean;
};

/** The single sidebar entry (and section tab) that owns `pathname`: longest prefix wins. */
export function resolveNav(groups: NavGroup[], pathname: string): ResolvedNav {
  let item: NavItem | undefined;
  let top = -1;
  for (const g of groups) {
    for (const it of g.items) {
      const s = best(pathname, [it.href, ...(it.match ?? []), ...(it.children ?? []).flatMap((c) => [c.href, ...(c.match ?? [])])]);
      if (s > top) [top, item] = [s, it];
    }
  }
  if (!item) return { exact: false };
  let child: NavChild | undefined;
  let childTop = -1;
  for (const c of item.children ?? []) {
    const s = best(pathname, [c.href, ...(c.match ?? [])]);
    if (s > childTop) [childTop, child] = [s, c];
  }
  const exact = [item.href, ...(item.match ?? []), ...(item.children ?? []).flatMap((c) => [c.href, ...(c.match ?? [])])].includes(pathname);
  return { item, child, exact };
}
