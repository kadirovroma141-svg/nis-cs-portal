import { NextRequest, NextResponse } from "next/server";
import { getTopicSlidesUrl, saveTopicSlidesUrl, normalizeGoogleSlidesUrl } from "@/lib/slides";
import { getCurrentProfile } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const url = await getTopicSlidesUrl(slug);
  return NextResponse.json({ slug, slidesUrl: url });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== "teacher" && profile.role !== "admin")) {
    return NextResponse.json({ error: "Only teachers and admins can edit topic slides" }, { status: 403 });
  }

  const { slug } = await params;
  const body = await req.json();
  const rawUrl = body.slidesUrl;

  if (!rawUrl || typeof rawUrl !== "string") {
    return NextResponse.json({ error: "slidesUrl is required" }, { status: 400 });
  }

  const normalized = normalizeGoogleSlidesUrl(rawUrl);
  if (!normalized) {
    return NextResponse.json(
      { error: "Некорректная ссылка на Google Презентацию. Вставьте обычную ссылку Google Slides, ссылку на публикацию или ID." },
      { status: 400 }
    );
  }

  const ok = await saveTopicSlidesUrl(slug, normalized);
  if (!ok) {
    return NextResponse.json({ error: "Failed to save slides URL" }, { status: 500 });
  }

  return NextResponse.json({ success: true, slug, slidesUrl: normalized });
}
