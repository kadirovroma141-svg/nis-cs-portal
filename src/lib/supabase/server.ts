import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL, authCookieOptions, isSupabaseConfigured } from "../env";

// Offline stand-in when Supabase env vars are absent; intentionally loosely typed.
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
function createDummyClient() {
  const queryBuilder = (): any => {
    const builder: any = {
      select: () => builder,
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => builder,
      upsert: () => Promise.resolve({ data: null, error: null }),
      delete: () => builder,
      eq: () => builder,
      neq: () => builder,
      gt: () => builder,
      gte: () => builder,
      lt: () => builder,
      lte: () => builder,
      like: () => builder,
      ilike: () => builder,
      is: () => builder,
      in: () => builder,
      contains: () => builder,
      order: () => builder,
      limit: () => builder,
      range: () => builder,
      single: () => Promise.resolve({ data: null, error: null }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      then: (resolve: any) => Promise.resolve({ data: [], count: 0, error: null }).then(resolve),
    };
    return builder;
  };

  return {
    auth: {
      getClaims: async () => ({ data: { claims: { sub: "00000000-0000-0000-0000-000000000001" } } }),
      getUser: async () => ({ data: { user: { id: "00000000-0000-0000-0000-000000000001", email: "roma@students.internal" } } }),
      signOut: async () => ({ error: null }),
    },
    from: (_table: string) => queryBuilder(),
    rpc: async (_fn: string, _args?: any) => ({ data: null, error: null }),
    storage: {
      from: (_bucket: string) => ({
        upload: async () => ({ data: null, error: null }),
        remove: async () => ({ data: null, error: null }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: path } }),
        createSignedUrls: async (paths: string[]) => ({ data: paths.map((p) => ({ path: p, signedUrl: p })), error: null }),
      }),
    },
  } as any;
}
/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

/** Supabase client acting as the signed-in user (RLS applies). */
export async function createClient() {
  if (!isSupabaseConfigured()) {
    return createDummyClient();
  }
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookieOptions: authCookieOptions,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: the proxy refreshes the session instead.
        }
      },
    },
  });
}

