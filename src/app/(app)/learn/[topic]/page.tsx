import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Clock, FileQuestion, GraduationCap, Presentation } from "@/components/icons";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMasteryMap, getTopicBySlug } from "@/lib/curriculum";
import { getTopicSlidesUrl } from "@/lib/slides";
import { getTopicPresentations } from "@/lib/presentations";
import { GoogleSlidesEmbed } from "@/components/slides/google-slides-embed";
import { masteryStatus, STATUS_TONE } from "@/lib/mastery";
import { getProgressContext, loAverage, withCompletedTerms } from "@/lib/progress";
import { formatPercent } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { LoCode } from "@/components/lo-code";
import { Alert } from "@/components/ui/alert";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata({ params }: PageProps<"/learn/[topic]">): Promise<Metadata> {
  const topic = await getTopicBySlug((await params).topic);
  return { title: topic?.title ?? "Topic" };
}

export default async function TopicOverview({ params }: PageProps<"/learn/[topic]">) {
  const t = await getT();
  const profile = await requireProfile();
  const topic = await getTopicBySlug((await params).topic);
  if (!topic) notFound();
  const supabase = await createClient();
  const canEdit = profile.role === "teacher" || profile.role === "admin";
  const isStudent = profile.role === "student";
  const [realMastery, { count: questionCount }, { data: pack }, { data: exam }, slidesUrl, ctx] = await Promise.all([
    isStudent ? getMasteryMap(supabase, profile.id) : Promise.resolve(new Map<string, number>()),
    supabase.from("questions").select("id", { count: "exact", head: true }).eq("topic_id", topic.id).eq("status", "published").eq("practice_enabled", true),
    supabase.from("theory_packs").select("id, theory_sections(id)").eq("topic_id", topic.id).eq("status", "published").maybeSingle(),
    supabase.from("exams").select("id, duration_minutes").eq("topic_id", topic.id).eq("kind", "topic").eq("status", "published").limit(1).maybeSingle(),
    getTopicSlidesUrl(topic.slug),
    getProgressContext(),
  ]);
  const mastery = isStudent ? withCompletedTerms(ctx, realMastery) : realMastery;
  const loIds = topic.objectives.map((o) => o.id);
  const attempted = loIds.some((id) => mastery.has(id));
  const value = loAverage(loIds, mastery);
  const status = masteryStatus(value, attempted);
  const sections = (pack as { theory_sections: { id: string }[] } | null)?.theory_sections.length ?? 0;
  const presentations = getTopicPresentations(topic.slug);
  const base = `/learn/${topic.slug}`;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {topic.examOnly && (
          <Alert tone="warning" title={t("Exam-only topic")}>
            {t("These objectives are assessed in the exam (Paper 1-2-3 specification) but are not part of the 2026-2027 calendar plan.")}
          </Alert>
        )}

        {/* Interactive HTML Presentations / Google Slides */}
        <GoogleSlidesEmbed
          topicSlug={topic.slug}
          topicTitle={topic.title}
          initialSlidesUrl={slidesUrl}
          presentations={presentations}
          canEdit={canEdit}
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href={`${base}/slides`} className="rounded-xl border border-border bg-surface p-4 hover:bg-surface-2 transition-all">
            <Presentation className="h-5 w-5 text-accent" />
            <p className="mt-2 font-semibold text-sm">{t("Slides")}</p>
            <p className="text-xs text-muted">
              {presentations.length > 0
                ? `${presentations.length} ур.`
                : slidesUrl
                  ? t("Interactive deck")
                  : t("Attach presentation")}
            </p>
          </Link>
          <Link href={`${base}/theory`} className="rounded-xl border border-border bg-surface p-4 hover:bg-surface-2 transition-all">
            <BookOpen className="h-5 w-5 text-primary" />
            <p className="mt-2 font-semibold text-sm">{t("Theory Pack")}</p>
            <p className="text-xs text-muted">{sections ? t("{sections} sections", { sections }) : t("Coming soon")}</p>
          </Link>
          <Link href={`${base}/practice`} className="rounded-xl border border-border bg-surface p-4 hover:bg-surface-2 transition-all">
            <FileQuestion className="h-5 w-5 text-primary" />
            <p className="mt-2 font-semibold text-sm">{t("Practice")}</p>
            <p className="text-xs text-muted">{questionCount ?? 0}{" "}{t("questions")}</p>
          </Link>
          <Link href={`${base}/exam`} className="rounded-xl border border-border bg-surface p-4 hover:bg-surface-2 transition-all">
            <GraduationCap className="h-5 w-5 text-primary" />
            <p className="mt-2 font-semibold text-sm">{t("Exam Mode")}</p>
            <p className="text-xs text-muted">{exam ? t("Timed · {duration_minutes} min", { duration_minutes: exam.duration_minutes }) : t("Not available yet")}</p>
          </Link>
        </div>

        <Card>
          <CardHeader title={t("Learning objectives")} description={t("What you should be able to do after this topic.")} />
          <CardBody className="space-y-3">
            {topic.objectives.map((lo) => {
              const m = mastery.get(lo.id);
              return (
                <div key={lo.id} className="flex flex-wrap items-start gap-3 rounded-lg border border-border p-3">
                  <span className="rounded bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary"><LoCode code={lo.code} paper={lo.paper} /></span>
                  <p className="min-w-0 flex-1 text-sm">{lo.description}</p>
                  {isStudent && <Badge tone={STATUS_TONE[masteryStatus(m, m != null)]}>{m == null ? t("Not Started") : formatPercent(m)}</Badge>}
                </div>
              );
            })}
          </CardBody>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader title={t("Topic details")} />
          <CardBody>
            <dl className="space-y-3 text-sm">
              {topic.examOnly && <Row label={t("Programme")} value="Exam only (Paper 1-2-3)" />}
              {topic.school.map((s, i) => (
                <div key={i} className="space-y-3">
                  <Row label={t("Grade")} value={String(s.grade)} />
                  <Row label={t("Term")} value={s.term} />
                  <Row label={t("Unit")} value={`${s.unitCode} ${s.unitTitle}`} />
                  {s.period && <Row label={t("Taught")} value={s.period} />}
                </div>
              ))}
              <Row
                label={t("Paper component")}
                value={
                  topic.exam.length
                    ? topic.exam.map((e) => `${e.paperTitle} — ${e.sectionCode ? `${e.sectionCode} ` : ""}${e.section}`).join("; ")
                    : "—"
                }
              />
              <Row
                label={t("Recommended study time")}
                value={
                  topic.recommended_minutes ? (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {Math.round(topic.recommended_minutes / 60 * 10) / 10} h
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
            </dl>
          </CardBody>
        </Card>
        {isStudent && (
          <Card>
            <CardHeader title={t("Topic status")} />
            <CardBody className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge tone={STATUS_TONE[status]}>{t(status)}</Badge>
                <span className="text-2xl font-semibold tabular-nums">{formatPercent(attempted ? value : null)}</span>
              </div>
              <ProgressBar value={attempted ? value : 0} label={t("Topic mastery")} />
              <ButtonLink href={sections ? `${base}/theory` : `${base}/practice`} className="w-full">
                {attempted ? t("Keep practising") : t("Start this topic")}
              </ButtonLink>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
