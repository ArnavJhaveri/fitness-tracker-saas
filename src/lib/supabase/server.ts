/**
 * Server-side Supabase client.
 * Used in Server Components, Route Handlers, and Server Actions.
 * Reads cookies via the Next.js `cookies()` API for session hydration.
 *
 * Always call createClient() per-request — never cache the instance at module
 * scope because cookies() is request-scoped and caching would bleed sessions
 * across requests.
 *
 * NOTE on typing: see the long-form note in client.ts. We deliberately don't
 * pass the `<Database>` generic — the hand-written types in
 * src/types/database.ts don't compose with supabase-js's SELECT-string
 * narrowing. Run `supabase gen types` to enable strict typing.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll throws in Server Components (read-only context).
            // This is safe to swallow — middleware handles cookie refresh.
          }
        },
      },
    },
  );
}
