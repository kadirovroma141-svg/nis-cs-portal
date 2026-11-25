import type { Metadata } from "next";
import { InlineActionForm, SubmitButton } from "@/components/action-form";
import Link from "next/link";
import { Bell } from "@/components/icons";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { relativeTime } from "@/lib/format";
import type { NotificationRow } from "@/lib/db-types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { markAllRead } from "./actions";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Notifications") };
}

export default async function NotificationsPage() {
  const t = await getT();
  await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
  const list = (data ?? []) as NotificationRow[];
  return (
    <>
      <PageHeader
        title={t("Notifications")}
        actions={list.some((n) => !n.read_at) && (
          <InlineActionForm action={markAllRead}><SubmitButton variant="secondary">{t("Mark all as read")}</SubmitButton></InlineActionForm>
        )}
      />
      {list.length === 0 ? (
        <EmptyState title={t("No notifications yet")}>{t("New assignments, deadlines, results and feedback will appear here.")}</EmptyState>
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {list.map((n) => (
              <li key={n.id}>
                <Link href={n.link ?? "#"} className={cn("flex gap-3 px-5 py-4 hover:bg-surface-2", !n.read_at && "bg-primary-soft/40")}>
                  <Bell className={cn("mt-0.5 h-4 w-4 shrink-0", n.read_at ? "text-muted" : "text-primary")} />
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm", !n.read_at && "font-semibold")}>{n.title}</p>
                    {n.body && <p className="text-sm text-muted">{n.body}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-muted">{relativeTime(n.created_at, t)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
