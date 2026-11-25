import { describe, expect, it } from "vitest";
import { addDays, kzToday, minutesByDay, minutesByUser, splitHours } from "@/lib/usage";

describe("usage helpers", () => {
  it("uses the Kazakhstan day boundary (UTC+5)", () => {
    expect(kzToday(Date.parse("2026-11-24T18:59:00Z"))).toBe("2026-11-24");
    expect(kzToday(Date.parse("2026-11-24T19:00:00Z"))).toBe("2026-11-25");
  });
  it("adds days across months", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-01", -1)).toBe("2026-11-30");
  });
  it("sums minutes by user and by day, filling empty days", () => {
    const rows = [
      { user_id: "a", day: "2026-11-20", minutes: 30 },
      { user_id: "b", day: "2026-11-20", minutes: 15 },
      { user_id: "a", day: "2026-11-22", minutes: 40 },
    ];
    expect(minutesByUser(rows).get("a")).toBe(70);
    expect(minutesByDay(rows, "2026-11-20", "2026-11-22", new Set(["a"]))).toEqual([
      { day: "2026-11-20", minutes: 30 },
      { day: "2026-11-21", minutes: 0 },
      { day: "2026-11-22", minutes: 40 },
    ]);
  });
  it("splits minutes into hours", () => {
    expect(splitHours(125)).toEqual({ h: 2, m: 5 });
  });
});
