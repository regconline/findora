import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { env } from "@/lib/env";
import { SITE } from "@/lib/constants";
import { ConsentAndAnalytics } from "@/components/consent";
import { themeInitScript } from "@/components/theme";
import "./globals.css";

const inter = localFont({
  src: [
    { path: "./fonts/Inter-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Inter-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Inter-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/Inter-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  keywords: ["business directory South Africa", "find local businesses", "service providers South Africa", "list your business free", "local services near me", "Findora"],
  applicationName: SITE.name,
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: SITE.locale,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  alternates: { types: { "application/rss+xml": [{ url: "/blog/rss.xml", title: "Findora Blog" }] } },
  category: "business",
  creator: "Findora",
  publisher: "Findora",
  verification: env.gscVerification ? { google: env.gscVerification } : undefined,
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#102C3B" },
    { media: "(prefers-color-scheme: dark)", color: "#0a161c" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Applies the saved light/dark theme before first paint */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:shadow">
          Skip to content
        </a>
        {children}
        <ConsentAndAnalytics gaId={env.gaId} adsenseClient={env.adsenseEnabled ? env.adsenseClientId : ""} />
      </body>
    </html>
  );
}
