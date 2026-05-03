import type { NextConfig } from "next";

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
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
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
          // Remove or shorten max-age if the domain has non-HTTPS subdomains.
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
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
