import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Camera, ListChecks, Sparkles } from "@/components/icons";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTopicBySlug } from "@/lib/curriculum";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { NOTE_LIMITS, remainingChecks, signedPhotoUrls, type NoteSubmission } from "@/lib/notes/service";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NotesUploader } from "@/components/notes/notes-uploader";
import { NoteResultView, percentTone } from "@/components/notes/note-result";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Notes check") };
}
// The AI reads the photos inside the server action started from this page.
export const maxDuration = 120;

export default async function TopicNotesPage({ params, searchParams }: PageProps<"/learn/[topic]/notes">) {
  const t = await getT();
  const profile = await requireProfile();
  const topic = await getTopicBySlug((await params).topic);
  if (!topic) notFound();
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data }, remaining] = await Promise.all([
    supabase
      .from("note_submissions")
      .select("id, student_id, topic_id, image_paths, status, percentage, result, created_at")
      .eq("student_id", profile.id)
      .eq("topic_id", topic.id)
      .order("created_at", { ascending: false })
      .limit(30),
    remainingChecks(createAdminClient(), profile.id, topic.id),
  ]);
  const history = (data ?? []) as NoteSubmission[];
  const shown = history.find((h) => h.id === sp.check) ?? history[0];
  const photoUrls = shown ? await signedPhotoUrls(shown.image_paths) : [];
  const best = history.reduce<number | null>((m, h) => (h.percentage == null ? m : Math.max(m ?? 0, Number(h.percentage))), null);
  const base = `/learn/${topic.slug}/notes`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title={t("Check your notes")}
          description={t("Write your own notes on this topic by hand, photograph the pages and let the AI check that you covered every key point of the theory.")}
          action={best != null ? <Badge tone={percentTone(best)}>{t("Best:")}{" "}{Math.round(best)}%</Badge> : undefined}
        />
        <CardBody className="space-y-5">
          <ol className="grid gap-3 text-sm sm:grid-cols-3">
            <li className="flex gap-2"><Camera className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />{" "}{t("Photograph each page straight from above, in good light, with the whole page in the frame.")}</li>
            <li className="flex gap-2"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />{" "}{t("The AI compares your notes with the key points of the topic and gives a percentage.")}</li>
            <li className="flex gap-2"><ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />{" "}{t("You see what is missing, add it to your notebook and check again.")}</li>
          </ol>
          <NotesUploader slug={topic.slug} maxPhotos={NOTE_LIMITS.maxPhotos} remaining={remaining} />
        </CardBody>
      </Card>

      {shown && <NoteResultView submission={shown} photoUrls={photoUrls} audience="student" />}

      {history.length > 1 && (
        <Card>
          <CardHeader title={t("Earlier checks")} />
          <CardBody className="p-0">
            <ul className="divide-y divide-border">
              {history.map((h) => (
                <li key={h.id}>
                  <Link href={`${base}?check=${h.id}`} className={cn("flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-surface-2", h.id === shown?.id && "bg-surface-2")}>
                    <span className="flex-1">{formatDate(h.created_at, undefined, t)}</span>
                    <span className="text-xs text-muted">{h.image_paths.length}{" "}{t("page")}{h.image_paths.length === 1 ? "" : "s"}</span>
                    {h.percentage != null ? (
                      <Badge tone={percentTone(Number(h.percentage))}>{Math.round(Number(h.percentage))}%</Badge>
                    ) : (
                      <Badge tone="warning">{t("Not readable")}</Badge>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
