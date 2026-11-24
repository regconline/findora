import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : "*.supabase.co";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  serverExternalPackages: ["sharp"],
  experimental: {
    serverActions: {
      // Images are re-encoded server-side; keep below Vercel's 4.5 MB request limit.
      bodySizeLimit: "4mb",
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" },
    ],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  async redirects() {
    return [
      { source: "/search", destination: "/businesses", permanent: true },
      { source: "/explore", destination: "/businesses", permanent: true },
      { source: "/categories/accommodation-and-tourism/bandbs", destination: "/categories/accommodation-and-tourism/bed-and-breakfasts", permanent: true },
      { source: "/services/bandbs", destination: "/services/bed-and-breakfasts", permanent: true },
      { source: "/categories/events-and-entertainment/d-cor-and-hire", destination: "/categories/events-and-entertainment/decor-and-hire", permanent: true },
      { source: "/services/d-cor-and-hire", destination: "/services/decor-and-hire", permanent: true },
      { source: "/sitemap", destination: "/site-map", permanent: true },
      { source: "/about-us", destination: "/about", permanent: true },
      { source: "/privacy-policy", destination: "/privacy", permanent: true },
      { source: "/terms-and-conditions", destination: "/terms", permanent: true },
      { source: "/rss", destination: "/blog/rss.xml", permanent: true },
    ];
  },
};

export default nextConfig;
