"use client";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  Brain,
  BarChart3, BookOpen, ChevronDown, ClipboardCheck, ClipboardList, Eye, Database, FileText, GraduationCap, Layers, LayoutDashboard,
  LineChart, Radio, ScrollText, Settings, Target, User, Users, Library, type Icon,
} from "@/components/icons";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n/client";
import { resolveNav, type IconName, type NavGroup, type NavItem } from "./nav";

const ICONS: Record<IconName, Icon> = {
  dashboard: LayoutDashboard,
  learn: BookOpen,
  papers: FileText,
  mocks: GraduationCap,
  repeat: Brain,
  summative: ClipboardCheck,
  progress: Target,
  profile: User,
  classes: Layers,
  students: Users,
  assignments: ClipboardList,
  visibility: Eye,
  sessions: Radio,
  questions: Database,
  results: BarChart3,
  analytics: LineChart,
  users: Users,
  curriculum: Library,
  settings: Settings,
  audit: ScrollText,
};

/** Fixed-size dot that fades in while this link's navigation is pending (no layout shift). */
function PendingHint() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={cn("h-1.5 w-1.5 shrink-0 rounded-xs bg-accent transition-opacity", pending ? "animate-pulse opacity-100" : "opacity-0")}
    />
  );
}

/** Desktop: one horizontal row of chips under the masthead. Collapsible groups become a drop-down. */
export function NavBar({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  const t = useT();
  const { item: activeItem } = resolveNav(groups, pathname);
  const chip = (item: NavItem, inMenu = false) => {
    const active = item === activeItem;
    const Icon = ICONS[item.icon];
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={inMenu ? (e) => e.currentTarget.closest("details")?.removeAttribute("open") : undefined}
        aria-current={active ? "page" : undefined}
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-md border-[1.5px] px-3 text-sm font-semibold whitespace-nowrap transition-colors",
          active ? "border-ink bg-ink text-background" : "border-transparent text-muted hover:border-border-strong hover:text-fg",
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0", active ? "text-accent" : "")} weight={active ? "fill" : "bold"} aria-hidden />
        <span>{item.label}</span>
        <PendingHint />
      </Link>
    );
  };
  return (
    <nav aria-label={t("Main")} className="flex flex-wrap items-center gap-1">
      {groups.map((g, gi) => {
        if (g.collapsible && g.label) {
          return <NavDropdown key={gi} group={g} active={g.items.includes(activeItem as NavItem)} chip={chip} />;
        }
        return (
          <div key={gi} className="flex flex-wrap items-center gap-1">
            {g.label && <span className="label-mono mr-1 hidden text-muted xl:inline">{g.label}</span>}
            {g.items.map((it) => chip(it))}
            {gi < groups.length - 1 && <span aria-hidden className="mx-2 h-5 w-px bg-border-strong" />}
          </div>
        );
      })}
    </nav>
  );
}

function NavDropdown({
  group,
  active,
  chip,
}: {
  group: NavGroup;
  active: boolean;
  chip: (item: NavItem, inMenu?: boolean) => React.ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  // Click outside / Escape closes the panel.
  useEffect(() => {
    const close = () => ref.current?.removeAttribute("open");
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  return (
    <details ref={ref} className="group relative">
      <summary
        className={cn(
          "inline-flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-md border-[1.5px] px-3 text-sm font-semibold [&::-webkit-details-marker]:hidden",
          active ? "border-ink text-fg" : "border-dashed border-border-strong text-muted hover:text-fg",
        )}
      >
        {group.label}
        <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="absolute left-0 top-full z-40 mt-2 flex min-w-56 flex-col gap-0.5 rounded-lg border-2 border-ink bg-surface p-1.5 shadow-[5px_5px_0_0_var(--ink)]">
        {group.items.map((it) => chip(it, true))}
      </div>
    </details>
  );
}

/** Mobile sheet: big numbered rows, grouped. */
export function NavLinks({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { item: activeItem } = resolveNav(groups, pathname);
  const offsets = groups.map((_, i) => groups.slice(0, i).reduce((a, g) => a + g.items.length, 0));
  return (
    <div className="space-y-6">
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.label && <p className="label-mono mb-2 text-accent">{g.label}</p>}
          <ul className="divide-y divide-dashed divide-border-strong border-y border-dashed border-border-strong">
            {g.items.map((item, ii) => {
              const active = item === activeItem;
              const Icon = ICONS[item.icon];
              const n = offsets[gi] + ii + 1;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 px-1 py-3 text-base font-semibold transition-colors",
                      active ? "text-primary" : "text-fg hover:text-primary",
                    )}
                  >
                    <span aria-hidden className="w-6 font-mono text-xs text-muted">{String(n).padStart(2, "0")}</span>
                    <Icon className="h-5 w-5 shrink-0" weight={active ? "fill" : "bold"} aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    <PendingHint />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
