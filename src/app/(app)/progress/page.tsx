import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMasteryMap } from "@/lib/curriculum";
import { getProgressContext, overallMastery, paperReadiness, seesPapers, topicProgress, withCompletedTerms } from "@/lib/progress";
import { getRecentAttempts, attemptLink } from "@/lib/student-data";
import { masteryStatus, STATUS_TONE, MASTERY_STATUSES } from "@/lib/mastery";
import { formatDate, formatPercent } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar, ReadinessRow } from "@/components/ui/progress";
import { Table, Td, Th } from "@/components/ui/table";
import { Select, Input } from "@/components/ui/form";
import { Button, ButtonLink } from "@/components/ui/button";
import { AttemptStatusBadge } from "@/components/attempt-status";
import { Stat } from "@/components/ui/stat";
import { LoCode } from "@/components/lo-code";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("My Progress") };
}

export default async function ProgressPage({ searchParams }: PageProps<"/progress">) {
  const tx = await getT();
  const profile = await requireProfile(["student"]);
  const papers = seesPapers(profile);
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const f = { grade: get("grade"), term: get("term"), unit: get("unit"), paper: get("paper"), topic: get("topic"), lo: get("lo").trim(), status: get("status") };

  const supabase = await createClient();
  const [ctx, mastery, attempts, { data: rows }] = await Promise.all([
    getProgressContext(),
    getMasteryMap(supabase, profile.id),
    getRecentAttempts(supabase, profile.id, 30),
    supabase.from("student_mastery").select("learning_objective_id, practice_count, exam_count").eq("student_id", profile.id),
  ]);
  const counts = new Map((rows ?? []).map((r) => [r.learning_objective_id as string, r]));
  const shown = withCompletedTerms(ctx, mastery);
  const allTopics = topicProgress(ctx, shown);
  const units = [...new Map(allTopics.map((t) => [t.unitCode, t.unitTitle])).entries()].sort();

  const topics = allTopics.filter(
    (t) =>
      (!f.grade || t.grade === Number(f.grade)) &&
      (!f.term || t.termNumber === Number(f.term)) &&
      (!f.unit || t.unitCode === f.unit) &&
      (!f.paper || t.papers.includes(Number(f.paper))) &&
      (!f.topic || t.slug === f.topic) &&
      (!f.status || t.status === f.status),
  );
  const topicIds = new Set(topics.map((t) => t.id));
  const los = ctx.los.filter(
    (l) =>
      l.topicIds.some((id) => topicIds.has(id)) &&
      (!f.paper || l.papers.includes(Number(f.paper))) &&
      (!f.lo || l.code.startsWith(f.lo) || l.description.toLowerCase().includes(f.lo.toLowerCase())),
  );
  const grade = profile.grade ?? 12;

  return (
    <>
      <PageHeader title={tx("My Progress")} description={tx("Mastery is measured per learning objective; topics, terms and papers are averages of their objectives.")} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={tx("Overall mastery")} value={formatPercent(overallMastery(ctx, shown, grade))} />
        {papers && paperReadiness(ctx, mastery, grade).map((r) => (
          <Card key={r.paper} className="p-4">
            <ReadinessRow label={tx("Paper {paper}", { paper: r.paper })} value={r.value} sub={tx("readiness")} />
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardBody>
          <form className="grid gap-3 sm:grid-cols-4 lg:grid-cols-8" aria-label={tx("Filters")}>
            <Select name="grade" defaultValue={f.grade} aria-label={tx("Grade")}>
              <option value="">{tx("All grades")}</option>
              {[7, 8, 9, 10, 11, 12].map((g) => (
                <option key={g} value={String(g)}>{tx("Grade")}{" "}{g}</option>
              ))}
            </Select>
            <Select name="term" defaultValue={f.term} aria-label={tx("Term")}>
              <option value="">{tx("All terms")}</option>
              {[1, 2, 3, 4].map((t) => (
                <option key={t} value={t}>{tx("Term")}{" "}{["I", "II", "III", "IV"][t - 1]}</option>
              ))}
              <option value="0">{tx("Exam only")}</option>
            </Select>
            <Select name="unit" defaultValue={f.unit} aria-label={tx("Unit")}>
              <option value="">{tx("All units")}</option>
              {units.map(([code, title]) => (
                <option key={code} value={code}>{code} {title}</option>
              ))}
            </Select>
            {papers && (
              <Select name="paper" defaultValue={f.paper} aria-label={tx("Paper")}>
                <option value="">{tx("All papers")}</option>
                {[1, 2, 3].map((p) => (
                  <option key={p} value={p}>{tx("Paper")}{" "}{p}</option>
                ))}
              </Select>
            )}
            <Select name="topic" defaultValue={f.topic} aria-label={tx("Topic")}>
              <option value="">{tx("All topics")}</option>
              {allTopics.map((t) => (
                <option key={t.id} value={t.slug}>{t.title} ({t.examOnly ? tx("exam only") : `G${t.grade}`})</option>
              ))}
            </Select>
            <Select name="status" defaultValue={f.status} aria-label={tx("Status")}>
              <option value="">{tx("Any status")}</option>
              {MASTERY_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
            <Input name="lo" defaultValue={f.lo} placeholder={tx("LO code e.g. 11.2.1")} aria-label={tx("Learning objective")} />
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">{tx("Filter")}</Button>
              <ButtonLink href="/progress" variant="ghost">{tx("Reset")}</ButtonLink>
            </div>
          </form>
        </CardBody>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title={tx("Topics ({length})", { length: topics.length })} />
          <CardBody className="p-0">
            <Table>
              <thead>
                <tr><Th>{tx("Topic")}</Th><Th className="w-36">{tx("Mastery")}</Th><Th>{tx("Status")}</Th></tr>
              </thead>
              <tbody>
                {topics.map((t) => (
                  <tr key={t.id}>
                    <Td>
                      <Link href={`/learn/${t.slug}`} className="font-medium hover:underline">{t.title}</Link>
                      <p className="text-xs text-muted">{t.examOnly ? tx("Exam only") : `G${t.grade} · ${t.termTitle} · ${t.unitCode}`}{papers && t.papers.length ? ` · ${t.papers.map((p) => `P${p}`).join(", ")}` : ""}</p>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <ProgressBar value={t.mastery} label={t.title} />
                        <span className="w-9 text-right text-xs tabular-nums">{formatPercent(t.mastery)}</span>
                      </div>
                    </Td>
                    <Td><Badge tone={STATUS_TONE[t.status]}>{tx(t.status)}</Badge></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={tx("Learning objectives ({length})", { length: los.length })} />
          <CardBody className="max-h-[48rem] overflow-y-auto p-0">
            <Table>
              <thead>
                <tr><Th>{tx("Objective")}</Th><Th className="w-36">{tx("Mastery")}</Th><Th>{tx("Evidence")}</Th></tr>
              </thead>
              <tbody>
                {los.map((l) => {
                  const m = mastery.get(l.id);
                  const c = counts.get(l.id);
                  const status = masteryStatus(m, m != null);
                  return (
                    <tr key={l.id}>
                      <Td>
                        <LoCode code={l.code} paper={l.source === "paper"} className="text-xs font-semibold text-primary" />
                        <p className="text-xs">{l.description}</p>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <ProgressBar value={m} label={l.code} />
                          <Badge tone={STATUS_TONE[status]}>{m == null ? "—" : formatPercent(m)}</Badge>
                        </div>
                      </Td>
                      <Td className="text-xs text-muted">{c ? tx("{practice_count} practice · {exam_count} exam", { practice_count: c.practice_count, exam_count: c.exam_count }) : "—"}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title={tx("Exam history")} />
        <CardBody className="p-0">
          <Table>
            <thead>
              <tr><Th>{tx("Exam")}</Th><Th>{tx("Date")}</Th><Th>{tx("Status")}</Th><Th className="text-right">{tx("Score")}</Th></tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a.id}>
                  <Td><Link href={attemptLink(a)} className="font-medium hover:underline">{a.exams?.title ?? tx("Exam")}</Link></Td>
                  <Td className="text-muted">{formatDate(a.submitted_at ?? a.started_at, undefined, tx)}</Td>
                  <Td><AttemptStatusBadge status={a.status} /></Td>
                  <Td className="text-right tabular-nums">{a.status === "GRADED" && a.show_results ? formatPercent(a.percentage) : "—"}</Td>
                </tr>
              ))}
              {attempts.length === 0 && (
                <tr><Td colSpan={4} className="text-center text-muted">{tx("No exams yet.")}</Td></tr>
              )}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    </>
  );
}
