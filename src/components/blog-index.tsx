import Link from "next/link";
import { FileText } from "lucide-react";
import { Container, Breadcrumbs, EmptyState, Pagination } from "@/components/ui";
import { PostCard } from "@/components/post-card";
import { cn } from "@/lib/utils";
import type { BlogPost } from "@/lib/types";
import { JsonLd } from "@/components/json-ld";
import { env } from "@/lib/env";

export function BlogIndex({ title, description, posts, total, page, cats, base, activeCat }: {
  title: string; description: string; posts: BlogPost[]; total: number; page: number;
  cats: { slug: string; name: string }[]; base: string; activeCat?: string;
}) {
  return (
    <Container className="py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: activeCat ? `${title} — Findora Blog` : "Findora Blog",
          url: `${env.siteUrl}${base}`,
          description,
          publisher: { "@type": "Organization", name: "Findora", logo: { "@type": "ImageObject", url: `${env.siteUrl}/brand/findora-icon.png` } },
          blogPost: posts.map((p) => ({
            "@type": "BlogPosting",
            headline: p.title,
            url: `${env.siteUrl}/blog/${p.slug}`,
            datePublished: p.published_at,
            ...(p.cover_image_url ? { image: p.cover_image_url.startsWith("/") ? `${env.siteUrl}${p.cover_image_url}` : p.cover_image_url } : {}),
          })),
        }}
      />
      <Breadcrumbs items={activeCat ? [{ label: "Blog", href: "/blog" }, { label: title }] : [{ label: "Blog" }]} />
      <h1 className="mt-4 text-3xl font-bold sm:text-4xl animate-fade-up">{title}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">{description}</p>
      {cats.length ? (
        <nav aria-label="Blog categories" className="mt-6 flex flex-wrap gap-2">
          <Link href="/blog" className={cn("rounded-full px-3 py-1.5 text-sm font-medium", !activeCat ? "bg-navy-900 text-white" : "bg-surface text-heading ring-1 ring-line hover:ring-navy-900/30")}>All articles</Link>
          {cats.map((c) => (
            <Link key={c.slug} href={`/blog/category/${c.slug}`} className={cn("rounded-full px-3 py-1.5 text-sm font-medium", activeCat === c.slug ? "bg-navy-900 text-white" : "bg-surface text-heading ring-1 ring-line hover:ring-navy-900/30")}>{c.name}</Link>
          ))}
        </nav>
      ) : null}
      {posts.length ? (
        <>
          <ul className="reveal mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => <li key={p.id}><PostCard post={p} /></li>)}
          </ul>
          <Pagination className="mt-12" page={page} pages={Math.ceil(total / 9)} hrefFor={(p) => (p > 1 ? `${base}?page=${p}` : base)} />
        </>
      ) : (
        <EmptyState className="mt-10" icon={FileText} title="No articles yet" description="New guides are on the way." />
      )}
    </Container>
  );
}
