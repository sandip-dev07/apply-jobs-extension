import type { NextConfig } from "next";

// Single content policy for every route (pages + API). Notes:
// - script/style keep 'unsafe-inline' because Next.js ships inline runtime
//   code; external scripts/objects/frames stay blocked, which is where the
//   real XSS value is. React already escapes all rendered content.
// - Client code only talks to same-origin /api (Notion is server-to-server),
//   fonts are self-hosted by next/font — hence the tight src lists.
// - frame-ancestors 'none' (+ X-Frame-Options) so the dashboard (and its
//   Notion data) can never be iframed elsewhere.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), ambient-light-sensor=(), autoplay=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
