"use client";
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, authCookieOptions } from "../env";

let client: ReturnType<typeof createBrowserClient> | undefined;

/** Browser client acting as the signed-in user (RLS applies). */
export function getBrowserClient() {
  client ??= createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, { cookieOptions: authCookieOptions });
  return client;
}
