// Decides what to do with the signed-in user's profile row. A failed or timed-out
// query (Supabase outage) must not look like a disabled account: signing the user
// out then breaks running lessons, games and exams although the account is fine.

export type ProfileGate<P> =
  | { kind: "ok"; profile: P }
  | { kind: "disabled" } // is_active = false, or the row really does not exist
  | { kind: "unavailable" }; // the query failed: keep the session, let the user retry

/** How long the proxy waits for the profile row before treating the database as unavailable. */
export const PROFILE_QUERY_TIMEOUT_MS = 8_000;

export function profileGate<P extends { is_active: boolean }>(
  profile: P | null | undefined,
  error: unknown,
): ProfileGate<P> {
  if (error) return { kind: "unavailable" };
  if (!profile || !profile.is_active) return { kind: "disabled" };
  return { kind: "ok", profile };
}
