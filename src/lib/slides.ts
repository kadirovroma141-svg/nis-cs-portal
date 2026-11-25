import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { createClient } from "@/lib/supabase/server";

const SLIDES_FILE_PATH = join(process.cwd(), "content/curriculum/topic-slides.json");

/**
 * Normalizes any Google Slides link (edit, preview, pub, iframe, or raw ID)
 * into a valid embedded iframe URL.
 */
export function normalizeGoogleSlidesUrl(input: string): string | null {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // If passed an iframe tag: <iframe src="..."/>
  const iframeMatch = trimmed.match(/src=["']([^"']+)["']/i);
  const rawUrl = iframeMatch ? iframeMatch[1] : trimmed;

  // Standard Google Slides presentation link:
  // e.g. https://docs.google.com/presentation/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing
  // or /pub?start=false... or /preview...
  const presentationMatch = rawUrl.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (presentationMatch) {
    const id = presentationMatch[1];
    return `https://docs.google.com/presentation/d/${id}/embed?start=false&loop=false&delayms=3000`;
  }

  // Published embed link:
  // e.g. https://docs.google.com/presentation/d/e/2PACX-1v.../pub?start=false...
  const pubMatch = rawUrl.match(/docs\.google\.com\/presentation\/d\/e\/([a-zA-Z0-9_-]+)/);
  if (pubMatch) {
    const id = pubMatch[1];
    return `https://docs.google.com/presentation/d/e/${id}/embed?start=false&loop=false&delayms=3000`;
  }

  // Raw presentation ID:
  if (/^[a-zA-Z0-9_-]{25,}$/.test(rawUrl)) {
    return `https://docs.google.com/presentation/d/${rawUrl}/embed?start=false&loop=false&delayms=3000`;
  }

  // If already a valid docs.google.com embed URL
  if (rawUrl.includes("docs.google.com/presentation") && rawUrl.includes("/embed")) {
    return rawUrl;
  }

  return null;
}

/**
 * Reads all topic -> slides mappings from storage.
 */
export async function getAllTopicSlides(): Promise<Record<string, string>> {
  try {
    if (!existsSync(SLIDES_FILE_PATH)) {
      return {};
    }
    const content = await readFile(SLIDES_FILE_PATH, "utf8");
    return JSON.parse(content);
  } catch (err) {
    console.error("Failed to read topic slides file:", err);
    return {};
  }
}

/**
 * Returns the Google Slides URL for a given topic slug: the topic_slides table first,
 * then the legacy content/curriculum/topic-slides.json.
 */
export async function getTopicSlidesUrl(slug: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("topic_slides").select("url").eq("topic_slug", slug).maybeSingle();
  if (data?.url) return data.url as string;
  const map = await getAllTopicSlides();
  return map[slug] ?? null;
}

/**
 * Saves or updates the Google Slides URL for a given topic slug (RLS: teachers and
 * admins). Stored in the database: the file system is read-only on Vercel.
 */
export async function saveTopicSlidesUrl(slug: string, url: string): Promise<boolean> {
  const normalized = normalizeGoogleSlidesUrl(url);
  if (!normalized) return false;
  const supabase = await createClient();
  const { error } = await supabase
    .from("topic_slides")
    .upsert({ topic_slug: slug, url: normalized, updated_at: new Date().toISOString() }, { onConflict: "topic_slug" });
  if (error) console.error("Failed to save topic slides:", error.message);
  return !error;
}
