import { describe, expect, it } from "vitest";
import { profileGate } from "@/lib/profile-gate";

const active = { role: "teacher", force_password_change: false, is_active: true };

describe("profileGate", () => {
  it("query error → unavailable, never disabled (keeps the session)", () => {
    expect(profileGate(null, { message: "fetch failed" }).kind).toBe("unavailable");
    expect(profileGate(undefined, new DOMException("The operation timed out.", "TimeoutError")).kind).toBe("unavailable");
  });

  it("error wins even if stale data came back", () => {
    expect(profileGate({ ...active, is_active: false }, { message: "timeout" }).kind).toBe("unavailable");
  });

  it("no row without an error → disabled", () => {
    expect(profileGate(null, null).kind).toBe("disabled");
  });

  it("is_active = false → disabled", () => {
    expect(profileGate({ ...active, is_active: false }, null).kind).toBe("disabled");
  });

  it("active profile → ok", () => {
    expect(profileGate(active, null)).toEqual({ kind: "ok", profile: active });
  });
});
