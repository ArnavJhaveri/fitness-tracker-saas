/**
 * Browser-side Supabase client.
 * Used inside Client Components ("use client") and custom hooks.
 * Never import this in Server Components or Route Handlers — use server.ts instead.
 *
 * TODO: Once the Supabase project is set up, replace the generic with generated types:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.generated.ts
 *   Then: createBrowserClient<Database>(...)
 */
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
