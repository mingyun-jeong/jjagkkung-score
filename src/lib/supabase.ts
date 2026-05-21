import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client. Uses the service_role key, so it bypasses RLS.
 * NEVER import this from a "use client" file.
 */
declare global {
  // eslint-disable-next-line no-var
  var __JJAGKKUNG_SUPABASE__: SupabaseClient | undefined;
}

function build(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function supabase(): SupabaseClient {
  if (!globalThis.__JJAGKKUNG_SUPABASE__) {
    globalThis.__JJAGKKUNG_SUPABASE__ = build();
  }
  return globalThis.__JJAGKKUNG_SUPABASE__;
}
