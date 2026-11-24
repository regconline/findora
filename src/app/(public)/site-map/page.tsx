import Link from "next/link";
import type { Metadata } from "next";
import { Container, Breadcrumbs } from "@/components/ui";
import { getAllPostSlugs, getBlogPost, getCategories, getSitePages } from "@/lib/data";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Sitemap", description: "An overview of every section of Findora.", alternates: { canonical: "/site-map" } };

export default async function HtmlSitemap() {
  const [categories, pages, postSlugs] = await Promise.all([getCategories(), getSitePages(), getAllPostSlugs()]);
  const posts = (await Promise.all(postSlugs.slice(0, 60).map((p) => getBlogPost(p.slug)))).filter(Boolean);
  const col = (title: string, links: { href: string; label: string }[]) => (
    <section>
      <h2 className="text-lg font-semibold">{title}</h2>
      <ul className="mt-3 space-y-1.5 text-sm">{links.map((l) => <li key={l.href}><Link href={l.href} className="text-ink/80 hover:text-emerald-700 hover:underline">{l.label}</Link></li>)}</ul>
    </section>
  );
  return (
    <Container className="py-10">
      <Breadcrumbs items={[{ label: "Sitemap" }]} />
      <h1 className="mt-4 text-3xl font-bold">Sitemap</h1>
      <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        {col("Discover", [
          { href: "/", label: "Home" }, { href: "/businesses", label: "Explore businesses" }, { href: "/categories", label: "Categories" },
          { href: "/services", label: "Services directory" }, { href: "/blog", label: "Blog" },
        ])}
        {col("Businesses", [
          { href: "/list-your-business", label: "List your business" }, { href: "/register/business", label: "Business registration" },
          { href: "/how-it-works", label: "How Findora works" }, { href: "/listing-guidelines", label: "Listing guidelines" },
        ])}
        {col("Support", [
          { href: "/help", label: "Help Centre" }, { href: "/faq", label: "FAQs" }, { href: "/contact", label: "Contact" }, { href: "/report", label: "Report a business" },
        ])}
        {col("Company & legal", pages.filter((p) => !["how-it-works", "list-your-business", "help", "contact", "listing-guidelines"].includes(p.slug)).map((p) => ({ href: `/${p.slug}`, label: p.title })))}
      </div>
      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        {col("Business categories", categories.map((c) => ({ href: `/categories/${c.slug}`, label: c.name })))}
        {col("Articles", posts.map((p) => ({ href: `/blog/${p!.slug}`, label: p!.title })))}
      </div>
    </Container>
  );
}
