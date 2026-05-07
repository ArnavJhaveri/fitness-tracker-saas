/**
 * Browser-side Supabase client.
 * Used inside Client Components ("use client") and custom hooks.
 * Never import this in Server Components or Route Handlers — use server.ts instead.
 *
 * NOTE on typing: we deliberately don't pass the `<Database>` generic.
 *
 * The hand-written types in src/types/database.ts capture the schema shape
 * but not the SELECT-string narrowing that supabase-js v2 needs for chained
 * `.select("a, b, c")` calls — passing the generic surfaces "Property 'x'
 * does not exist on type 'never'" errors at every typed select site.
 *
 * To enable strict typing across the app, run:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 * Then add `<Database>` here and in server.ts. Until then, callers cast at
 * the result site (consistent with the existing db/* layer pattern of
 * `data as RowType` after queries).
 */
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
