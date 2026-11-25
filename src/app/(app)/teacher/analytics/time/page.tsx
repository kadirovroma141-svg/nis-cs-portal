import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile, displayName } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTeacherClasses, getVisibleStudents } from "@/lib/teacher-data";
import { nowMs } from "@/lib/format";
import { addDays, kzToday, minutesByDay, minutesByUser, splitHours, type UsageRow } from "@/lib/usage";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Table, Td, Th } from "@/components/ui/table";
import { Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AnalyticsTabs } from "@/components/teacher/analytics-tabs";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Time on site") };
}

const PERIODS = { "7": 7, "30": 30, all: 0 } as const;
type Period = keyof typeof PERIODS;

export default async function UsageTimePage({ searchParams }: PageProps<"/teacher/analytics/time">) {
  const tx = await getT();
  const profile = await requireProfile(["teacher", "admin"]);
  const sp = await searchParams;
  const cls = typeof sp.class === "string" ? sp.class : "";
  const period: Period = sp.period === "30" || sp.period === "all" ? sp.period : "7";
  const supabase = await createClient();

  const today = kzToday(nowMs());
  const weekFrom = addDays(today, -6);
  const days = PERIODS[period];
  const from = days ? addDays(today, -(days - 1)) : "2000-01-01";

  const [classes, students] = await Promise.all([getTeacherClasses(supabase, profile), getVisibleStudents(supabase)]);
  const classIds = classes.map((c) => c.id);
  const { data: memberRows } = classIds.length
    ? await supabase.from("class_members").select("class_id, student_id").in("class_id", classIds)
    : { data: [] as { class_id: string; student_id: string }[] };
  const members = (memberRows ?? []) as { class_id: string; student_id: string }[];

  // RLS returns only rows the viewer may see: their own, their students', or all for an admin.
  const rows: UsageRow[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data } = await supabase
      .from("usage_minutes")
      .select("user_id, day, minutes")
      .gte("day", from < weekFrom ? from : weekFrom)
      .order("day")
      .range(offset, offset + 999);
    rows.push(...((data ?? []) as UsageRow[]));
    if (!data || data.length < 1000) break;
  }

  const fmt = (min: number) => {
    const { h, m } = splitHours(min);
    return h ? tx("{h} h {m} min", { h, m: String(m).padStart(2, "0") }) : tx("{m} min", { m });
  };

  const studentIds = new Set(students.map((s) => s.id));
  const classStudents = (id: string) => new Set(members.filter((m) => m.class_id === id).map((m) => m.student_id));
  const scope = cls ? classStudents(cls) : studentIds;
  const inPeriod = rows.filter((r) => r.day >= from);
  const inWeek = rows.filter((r) => r.day >= weekFrom);
  const periodBy = minutesByUser(inPeriod);
  const weekBy = minutesByUser(inWeek);
  const sum = (by: Map<string, number>, ids: Set<string>) => [...ids].reduce((s, id) => s + (by.get(id) ?? 0), 0);

  const studentsTotal = sum(periodBy, scope);
  const active = [...scope].filter((id) => (periodBy.get(id) ?? 0) > 0).length;
  const mine = periodBy.get(profile.id) ?? 0;
  const firstDay = rows[0]?.day;
  const chartFrom = days ? from : (firstDay ?? today);
  const daily = minutesByDay(inPeriod, chartFrom < addDays(today, -59) ? addDays(today, -59) : chartFrom, today, scope);
  const maxDay = Math.max(1, ...daily.map((d) => d.minutes));

  const classRows = classes
    .map((c) => {
      const ids = classStudents(c.id);
      return { c, n: ids.size, period: sum(periodBy, ids), week: sum(weekBy, ids) };
    })
    .sort((a, b) => b.period - a.period);
  const studentRows = students
    .filter((s) => scope.has(s.id))
    .map((s) => ({ s, period: periodBy.get(s.id) ?? 0, week: weekBy.get(s.id) ?? 0 }))
    .sort((a, b) => b.period - a.period || displayName(a.s).localeCompare(displayName(b.s)));
  const periodLabel = period === "7" ? tx("Last 7 days") : period === "30" ? tx("Last 30 days") : tx("All time");

  return (
    <>
      <PageHeader
        title={tx("Analytics")}
        description={tx("Active time on the site: a minute counts when the tab is open and the user worked in it during the last 10 minutes (slides and mini-apps included). Several tabs count once.")}
      />
      <AnalyticsTabs />

      <Card>
        <CardBody>
          <form className="grid gap-2 sm:grid-cols-3">
            <Select name="class" defaultValue={cls} aria-label={tx("Class")}>
              <option value="">{tx("All my classes")}</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select name="period" defaultValue={period} aria-label={tx("Period")}>
              <option value="7">{tx("Last 7 days")}</option>
              <option value="30">{tx("Last 30 days")}</option>
              <option value="all">{tx("All time")}</option>
            </Select>
            <Button type="submit">{tx("Apply")}</Button>
          </form>
        </CardBody>
      </Card>

      {!firstDay ? (
        <EmptyState title={tx("No time recorded yet")}>
          {tx("Counting starts once this version of the site is live: open pages add a minute every minute.")}
        </EmptyState>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label={tx("Students, total")} value={fmt(studentsTotal)} sub={periodLabel} />
            <Stat label={tx("Active students")} value={active} sub={tx("of {length} students", { length: scope.size })} />
            <Stat label={tx("Per active student")} value={fmt(active ? studentsTotal / active : 0)} sub={periodLabel} />
            <Stat label={tx("Your time")} value={fmt(mine)} sub={periodLabel} />
          </div>
          <p className="mt-2 text-xs text-muted">{tx("Counted since {day}.", { day: firstDay })}</p>

          <Card className="mt-6">
            <CardHeader title={tx("Students' time by day")} />
            <CardBody>
              <div className="flex h-40 items-end gap-1" role="img" aria-label={tx("Students' time by day")}>
                {daily.map((d) => (
                  <div key={d.day} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${d.day}: ${fmt(d.minutes)}`}>
                    <div className="rounded-t bg-primary" style={{ height: `${(d.minutes / maxDay) * 100}%`, minHeight: d.minutes ? 2 : 0 }} />
                  </div>
                ))}
              </div>
              <div className="mt-1 flex justify-between text-xs text-muted tabular-nums">
                <span>{daily[0]?.day}</span>
                <span>{daily.at(-1)?.day}</span>
              </div>
            </CardBody>
          </Card>

          {!cls && classRows.length > 0 && (
            <Card className="mt-6">
              <CardHeader title={tx("By class")} />
              <CardBody className="p-0">
                <Table>
                  <thead>
                    <tr><Th>{tx("Class")}</Th><Th>{tx("Students")}</Th><Th>{periodLabel}</Th><Th>{tx("Last 7 days")}</Th><Th>{tx("Per student")}</Th></tr>
                  </thead>
                  <tbody>
                    {classRows.map(({ c, n, period: p, week }) => (
                      <tr key={c.id}>
                        <Td><Link href={`?class=${c.id}&period=${period}`} className="font-medium hover:underline">{c.name}</Link></Td>
                        <Td className="tabular-nums">{n}</Td>
                        <Td className="tabular-nums">{fmt(p)}</Td>
                        <Td className="tabular-nums">{fmt(week)}</Td>
                        <Td className="tabular-nums">{fmt(n ? p / n : 0)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </CardBody>
            </Card>
          )}

          <Card className="mt-6">
            <CardHeader title={tx("By student")} />
            <CardBody className="p-0">
              <Table>
                <thead>
                  <tr><Th>{tx("Student")}</Th><Th>{periodLabel}</Th><Th>{tx("Last 7 days")}</Th></tr>
                </thead>
                <tbody>
                  {studentRows.map(({ s, period: p, week }) => (
                    <tr key={s.id}>
                      <Td className="whitespace-nowrap"><Link href={`/teacher/students/${s.id}`} className="font-medium hover:underline">{displayName(s)}</Link></Td>
                      <Td className={p ? "tabular-nums" : "tabular-nums text-muted"}>{fmt(p)}</Td>
                      <Td className={week ? "tabular-nums" : "tabular-nums text-muted"}>{fmt(week)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </CardBody>
          </Card>
        </>
      )}
    </>
  );
}
