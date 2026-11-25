"use server";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function markAllRead(): Promise<{ error?: string } | void> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", profile.id).is("read_at", null);
  if (error) return { error: "Notifications could not be updated." };
  revalidatePath("/", "layout");
}
