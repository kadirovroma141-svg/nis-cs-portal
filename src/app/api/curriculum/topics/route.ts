import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { requireProfile } from "@/lib/auth";

export async function GET() {
  try {
    await requireProfile(["teacher", "admin"]);
    const root = process.cwd();
    const curriculumPath = join(root, "content/curriculum/NIS_CS_2026_2027.json");
    
    if (!existsSync(curriculumPath)) {
      return NextResponse.json({ error: "Curriculum file not found" }, { status: 404 });
    }

    const data = JSON.parse(readFileSync(curriculumPath, "utf8"));
    const losMap = new Map<string, string>();
    for (const obj of data.objectives || []) {
      losMap.set(obj.code, obj.description);
    }

    const topics: Array<{
      slug: string;
      title: string;
      grade: number;
      unitCode: string;
      unitTitle: string;
      termTitle: string;
      objectives: Array<{ code: string; description: string }>;
      hasLocalContent: boolean;
    }> = [];

    for (const grade of data.grades || []) {
      for (const term of grade.terms || []) {
        for (const unit of term.units || []) {
          for (const tp of unit.topics || []) {
            const hasLocalContent = existsSync(join(root, "content/topics", `${tp.slug}.json`));
            topics.push({
              slug: tp.slug,
              title: tp.title,
              grade: grade.number,
              unitCode: unit.code,
              unitTitle: unit.title,
              termTitle: term.title,
              objectives: (tp.objectives || []).map((code: string) => ({
                code,
                description: losMap.get(code) || "",
              })),
              hasLocalContent,
            });
          }
        }
      }
    }

    return NextResponse.json({ topics });
  } catch (err: unknown) {
    console.error("Failed to load curriculum topics:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
