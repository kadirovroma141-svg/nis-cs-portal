import { CheckCircle2, CircleDashed, PenLine, PlusCircle, XCircle } from "@/components/icons";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { NoteSubmission } from "@/lib/notes/service";
import type { Advice, PointStatus } from "@/lib/notes/score";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import { Alert } from "@/components/ui/alert";
import { T } from "@/components/ui/t";
import { getT } from "@/lib/i18n/server";

const STATUS: Record<PointStatus, { label: string; Icon: typeof CheckCircle2; cls: string }> = {
  covered: { label: "Covered", Icon: CheckCircle2, cls: "text-success" },
  partial: { label: "Partly", Icon: CircleDashed, cls: "text-warning" },
  missing: { label: "Missing", Icon: XCircle, cls: "text-danger" },
};
const ADVICE: Record<Advice["kind"], { label: string; Icon: typeof PlusCircle }> = {
  add: { label: "Add", Icon: PlusCircle },
  complete: { label: "Complete", Icon: PenLine },
  fix: { label: "Fix", Icon: XCircle },
};

const TEXT = { success: "text-success", primary: "text-primary", warning: "text-warning", danger: "text-danger" } as const;

export function percentTone(p: number | null): "success" | "primary" | "warning" | "danger" {
  if (p == null) return "danger";
  return p >= 85 ? "success" : p >= 60 ? "primary" : p >= 40 ? "warning" : "danger";
}

/** One checked set of notes: score, what to add, the checklist and the photos. */
export async function NoteResultView({
  submission: s,
  photoUrls,
  topicTitle,
  audience,
}: {
  submission: NoteSubmission;
  photoUrls: string[];
  topicTitle?: string;
  /** "student": addressed to the student · "teacher": neutral wording */
  audience: "student" | "teacher";
}) {
  const t = await getT();
  const r = s.result;
  const mine = audience === "student";
  const counts = (st: PointStatus) => r.points.filter((p) => p.status === st).length;

  if (s.status === "UNREADABLE") {
    return (
      <Card>
        <CardHeader title={t("The notes could not be checked")} description={`${topicTitle ? `${topicTitle} · ` : ""}${formatDate(s.created_at, undefined, t)}`} />
        <CardBody className="space-y-4">
          <Alert tone="warning">
            {r.reason === "off_topic"
              ? mine ? t("These notes do not seem to be about this topic. Check that you opened the right topic and photographed the right pages.") : t("The photos do not seem to be notes on this topic.")
              : mine ? t("The AI could not read the photos. Take them again in good light, straight from above, with the whole page in the frame.") : t("The AI could not read the photos.")}
          </Alert>
          <Photos urls={photoUrls} />
        </CardBody>
      </Card>
    );
  }

  const percent = Number(s.percentage ?? 0);
  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="flex flex-wrap items-center gap-6 p-6">
          <div className="text-center">
            <p className={cn("text-5xl font-semibold tabular-nums", TEXT[percentTone(percent)])}>{Math.round(percent)}%</p>
            <p className="mt-1 text-xs text-muted"><T s="of the key points" /></p>
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-sm text-muted">{topicTitle ? `${topicTitle} · ` : ""}<T s="checked" />{" "}{formatDate(s.created_at, undefined, t)} · {s.image_paths.length}{" "}<T s="page" />{s.image_paths.length === 1 ? "" : "s"}</p>
            <ProgressBar value={percent} tone={percentTone(percent)} label={t("Notes coverage")} />
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge tone="success">{counts("covered")}{" "}<T s="covered" /></Badge>
              <Badge tone="warning">{counts("partial")}{" "}<T s="partly" /></Badge>
              <Badge tone="danger">{counts("missing")}{" "}<T s="missing" /></Badge>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={r.advice.length ? (mine ? t("What to add for 100%") : t("Advice given to the student")) : t("Nothing to add")}
          description={r.advice.length ? t("Most valuable first. The number shows how much each one adds to the score.") : mine ? t("Your notes cover every key point of the topic.") : t("The notes cover every key point.")}
        />
        {r.advice.length > 0 && (
          <CardBody>
            <ol className="space-y-3">
              {r.advice.map((a, i) => {
                const { label, Icon } = ADVICE[a.kind];
                return (
                  <li key={i} className="flex gap-3">
                    <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", a.kind === "fix" ? "text-danger" : "text-primary")} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        <span className="text-muted">{label}:</span> {a.title}
                        {a.gain > 0 && <Badge tone="primary" className="ml-2">+{a.gain}%</Badge>}
                      </p>
                      <p className="text-sm text-muted">{a.text}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </CardBody>
        )}
      </Card>

      <Card>
        <CardHeader title={t("Key points of the topic")} description={t("Each point is checked against what is written in the photos.")} />
        <CardBody className="p-0">
          <ul className="divide-y divide-border">
            {r.points.map((p, i) => {
              const { label, Icon, cls } = STATUS[p.status];
              return (
                <li key={i} className="flex gap-3 px-5 py-3">
                  <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", cls)} aria-label={label} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{p.title}</p>
                    {(p.status !== "covered" || !mine) && <p className="text-sm text-muted">{p.must}</p>}
                    {p.note && <p className="text-sm text-warning">{p.note}</p>}
                  </div>
                  <span className={cn("whitespace-nowrap text-xs font-medium", cls)}>{label}</span>
                </li>
              );
            })}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={mine ? t("Your photos") : t("Photos")} />
        <CardBody><Photos urls={photoUrls} /></CardBody>
      </Card>
    </div>
  );
}

async function Photos({ urls }: { urls: string[] }) {
  const t = await getT();
  if (!urls.length) return <p className="text-sm text-muted"><T s="The photos are no longer available." /></p>;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {urls.map((u, i) => (
        <li key={i}>
          <a href={u} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage */}
            <img src={u} alt={t("Page {v0} of the notes", { v0: i + 1 })} loading="lazy" className="aspect-[3/4] w-full object-cover" />
          </a>
        </li>
      ))}
    </ul>
  );
}
