import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CmsPage } from "@/components/cms-page";
import { getSitePage, getSitePages } from "@/lib/data";

// CMS-managed pages: about, listing-guidelines, privacy, terms, cookies, advertising-policy
// and any page an administrator creates in the admin dashboard.
export const revalidate = 600;
export const dynamicParams = true;

const RESERVED = new Set(["how-it-works", "list-your-business", "help", "faq", "contact", "report"]);
const LEGAL = new Set(["privacy", "terms", "cookies", "advertising-policy", "paia-manual"]);

export async function generateStaticParams() {
  return (await getSitePages()).filter((p) => !RESERVED.has(p.slug)).map((p) => ({ page: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }): Promise<Metadata> {
  const { page } = await params;
  const p = RESERVED.has(page) ? null : await getSitePage(page);
  if (!p) return { title: "Page not found", robots: { index: false } };
  return {
    title: p.seo_title || p.title,
    description: p.seo_description || p.summary || undefined,
    alternates: { canonical: `/${p.slug}` },
  };
}

export default async function SitePageRoute({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  if (RESERVED.has(page)) notFound();
  const p = await getSitePage(page);
  if (!p) notFound();
  return <CmsPage page={p} showUpdated={LEGAL.has(p.slug)} />;
}
