import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import bundleAnalyzer from "@next/bundle-analyzer";

// ─── Bundle analysis ──────────────────────────────────────────────────────────
// Run: ANALYZE=true npm run build
// Opens an interactive treemap showing what is in each bundle.
//
// We import @next/bundle-analyzer eagerly rather than via top-level
// `await import(...)` — Next.js 16's TS config loader compiles this file
// to CommonJS, and CJS can't `require()` an ESM module that contains TLA
// (it errors with ERR_REQUIRE_ASYNC_MODULE, breaking `npm run build`).
// Eager importing the wrapper factory is free: it returns a function, no
// analysis runs until ANALYZE is set and the wrapper is actually invoked.
const withBundleAnalyzer =
  process.env.ANALYZE === "true" ? bundleAnalyzer({ enabled: true }) : (c: NextConfig) => c;

// ─── Content Security Policy ──────────────────────────────────────────────────
// Assembled as an array so individual directives are easy to read and audit.
// Notes:
//   - 'unsafe-inline' on script-src is required for Next.js 16's inline
//     bootstrap scripts. Removing it breaks hydration. A nonce-based CSP
//     can eliminate this in the future (requires middleware rewrite).
//   - 'unsafe-eval' is needed in development for React Fast Refresh.
//     It is omitted from the production policy string below.
//   - connect-src must include the Supabase project URL (wss for realtime)
//     and the Next.js HMR websocket in development.
//   - frame-ancestors 'none' supersedes X-Frame-Options and blocks
//     clickjacking in all modern browsers.

const isDev = process.env.NODE_ENV === "development";

const cspDirectives = [
  "default-src 'self'",
  // Scripts: allow inline (Next.js bootstrap) + eval only in dev
  isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'",
  // Styles: inline styles are used by Tailwind and component libraries
  "style-src 'self' 'unsafe-inline'",
  // Images: allow data URIs (base64 avatars) and Supabase Storage
  "img-src 'self' data: blob: https://*.supabase.co",
  // Fonts: self only (we use system fonts / CSS variables)
  "font-src 'self'",
  // Network: API calls go to the same origin; Supabase JS calls go to
  // the Supabase project. The wss:// entry covers Supabase Realtime.
  // sentry.io is added for error reporting in production.
  isDev
    ? "connect-src 'self' https://*.supabase.co wss://*.supabase.co ws://localhost:*"
    : "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io",
  // Forbid <iframe>, <object>, <embed>, and plugin content
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  // Prevent base-tag injection (relative URL hijacking)
  "base-uri 'self'",
  // Require HTTPS for all subresources loaded by this page
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  /**
   * HTTP security headers applied to every response.
   *
   * References:
   *   https://owasp.org/www-project-secure-headers/
   *   https://nextjs.org/docs/app/api-reference/next-config-js/headers
   */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // ── Clickjacking / frame embedding ──────────────────────────────
          // frame-ancestors in CSP supersedes this for modern browsers, but
          // X-Frame-Options is kept for legacy browser compatibility.
          { key: "X-Frame-Options", value: "DENY" },

          // ── MIME sniffing ────────────────────────────────────────────────
          { key: "X-Content-Type-Options", value: "nosniff" },

          // ── Referrer ─────────────────────────────────────────────────────
          // Sends the origin only; never leaks the full path to third parties.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

          // ── Feature / Permissions policy ─────────────────────────────────
          // Opt out of powerful browser APIs we never use.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },

          // ── HSTS ─────────────────────────────────────────────────────────
          // Instruct browsers to use HTTPS for 2 years (once deployed).
          // preload + includeSubDomains added for HSTS preload-list eligibility.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },

          // ── Content Security Policy ───────────────────────────────────────
          { key: "Content-Security-Policy", value: cspDirectives },
        ],
      },
    ];
  },

  // Strict mode catches potential problems during development
  reactStrictMode: true,

  // Typed routes catches broken <Link href> at compile time
  typedRoutes: true,

  images: {
    // Optimise images from Supabase Storage automatically.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    // Serve modern formats (AVIF → WebP → fallback) for significant size savings.
    formats: ["image/avif", "image/webp"],
  },

  // Minify output in production.
  compiler: {
    // Remove console.log in production builds (keep console.error/warn).
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },

  // Experimental: enable React compiler for automatic memoisation (Next.js 16+)
  // experimental: { reactCompiler: true },
};

// ─── Sentry wrapper ───────────────────────────────────────────────────────────
// withSentryConfig wraps the build to upload source maps and instrument
// server components. Options here control the Sentry Webpack plugin.
const sentryConfig = withSentryConfig(withBundleAnalyzer(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Upload source maps only in CI/production — not on local builds.
  // After uploading, delete the .map files so they are not served publicly.
  sourcemaps: {
    disable: !process.env.CI,
    filesToDeleteAfterUpload: process.env.CI ? ["**/*.js.map", "**/*.cjs.map"] : undefined,
  },

  // Silences Sentry's build output noise in development.
  silent: !process.env.CI,

  // Automatically instrument route handlers, API routes, and server components.
  autoInstrumentServerFunctions: true,
  autoInstrumentMiddleware: true,
  autoInstrumentAppDirectory: true,
});

export default sentryConfig;
