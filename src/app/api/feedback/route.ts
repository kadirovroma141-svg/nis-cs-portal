import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { rating, category, comment, url } = body;

    if (!rating || !category || typeof comment !== "string") {
      return NextResponse.json({ error: "Invalid feedback payload" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Log the user-centred design feedback entry
    console.log("[ISO 9241-210 HCD Feedback]", {
      userId: user?.id ?? "anonymous",
      rating,
      category,
      comment: comment.slice(0, 1000),
      url: url || req.headers.get("referer") || "unknown",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, message: "Feedback received successfully" });
  } catch (err: unknown) {
    console.error("Feedback route error:", err);
    return NextResponse.json({ error: "Failed to process feedback" }, { status: 500 });
  }
}
