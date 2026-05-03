// Re-export the right client factory depending on call site.
// Import the specific file you need rather than this barrel when tree-shaking matters.
export { createClient as createBrowserSupabaseClient } from "./client";
export { createClient as createServerSupabaseClient } from "./server";
export { createMiddlewareClient } from "./middleware";
