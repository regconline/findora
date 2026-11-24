import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Container, Breadcrumbs, LinkButton } from "@/components/ui";
import { Markdown } from "@/components/markdown";
import { PostCard } from "@/components/post-card";
import { AdSlot } from "@/components/ad-slot";
import { JsonLd } from "@/components/json-ld";
import { getAllPostSlugs, getBlogPost, getBlogPosts, getCategories } from "@/lib/data";
import { env } from "@/lib/env";
import { formatDate, isOptimizableImage } from "@/lib/utils";

export const revalidate = 300;
type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getAllPostSlugs()).slice(0, 100).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getBlogPost(slug);
  if (!p) return { title: "Article not found", robots: { index: false } };
  return {
    title: p.seo_title || p.title,
    description: p.seo_description || p.excerpt,
    alternates: { canonical: `/blog/${p.slug}` },
    openGraph: {
      type: "article",
      title: p.title,
      description: p.excerpt,
      publishedTime: p.published_at ?? undefined,
      modifiedTime: p.updated_at,
      authors: [p.author_name],
      ...(p.cover_image_url ? { images: [{ url: p.cover_image_url, alt: p.cover_image_alt ?? "" }] } : {}),
    },
  };
}

/** Splits the article roughly in half at a heading so an ad can sit between sections. */
function splitForAd(md: string): [string, string] {
  const parts = md.split(/\n(?=## )/);
  if (parts.length < 4) return [md, ""];
  const mid = Math.floor(parts.length / 2);
  return [parts.slice(0, mid).join("\n"), parts.slice(mid).join("\n")];
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();
  const [{ posts: sameCat }, { posts: latest }] = await Promise.all([
    post.category_id ? getBlogPosts({ pageSize: 3, categoryId: post.category_id, excludeId: post.id }) : Promise.resolve({ posts: [] }),
    getBlogPosts({ pageSize: 4, excludeId: post.id }),
  ]);
  const categories = (await getCategories()).slice(0, 8);
  const related = [...sameCat, ...latest.filter((l) => !sameCat.some((s) => s.id === l.id))].slice(0, 3);
  const [first, second] = splitForAd(post.content);
  const url = `${env.siteUrl}/blog/${post.slug}`;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.excerpt,
          datePublished: post.published_at,
          dateModified: post.updated_at,
          author: { "@type": "Organization", name: post.author_name },
          publisher: { "@type": "Organization", name: "Findora", logo: { "@type": "ImageObject", url: `${env.siteUrl}/brand/findora-icon.png` } },
          mainEntityOfPage: url,
          ...(post.cover_image_url ? { image: [post.cover_image_url.startsWith("/") ? `${env.siteUrl}${post.cover_image_url}` : post.cover_image_url] } : {}),
        }}
      />
      <Container className="py-10">
        <Breadcrumbs items={[{ label: "Blog", href: "/blog" }, ...(post.blog_categories ? [{ label: post.blog_categories.name, href: `/blog/category/${post.blog_categories.slug}` }] : []), { label: post.title }]} />
        <article className="mx-auto mt-8 max-w-3xl">
          <header>
            {post.blog_categories ? <Link href={`/blog/category/${post.blog_categories.slug}`} className="text-sm font-semibold text-emerald-700 hover:underline">{post.blog_categories.name}</Link> : null}
            <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-[2.6rem]">{post.title}</h1>
            <p className="mt-4 text-lg text-muted">{post.excerpt}</p>
            <p className="mt-5 text-sm text-muted">
              {post.updated_at && post.published_at && new Date(post.updated_at).getTime() - new Date(post.published_at).getTime() > 86400000 ? <>Updated <time dateTime={post.updated_at}>{formatDate(post.updated_at)}</time> · </> : null}By <span className="font-medium text-heading">{post.author_name}</span> · <time dateTime={post.published_at ?? undefined}>{formatDate(post.published_at)}</time> · {post.reading_minutes} min read
            </p>
          </header>
          {post.cover_image_url ? (
            <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl bg-canvas">
              <Image src={post.cover_image_url} alt={post.cover_image_alt ?? ""} fill priority sizes="(min-width: 768px) 768px, 100vw" className="object-cover" unoptimized={!isOptimizableImage(post.cover_image_url)} />
            </div>
          ) : null}
          <div className="mt-10">
            <Markdown>{first}</Markdown>
            {second ? <AdSlot placement="blog_article" className="my-10" /> : null}
            {second ? <Markdown>{second}</Markdown> : null}
          </div>
          <div className="mt-12 rounded-2xl bg-navy-900 p-6 text-white sm:p-8">
            <h2 className="text-xl font-semibold text-white">Looking for a trusted service provider?</h2>
            <p className="mt-2 text-white/75">Search businesses across South Africa and contact them directly — free.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <LinkButton href="/businesses">Explore businesses</LinkButton>
              <LinkButton href="/list-your-business" variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10">List your business</LinkButton>
            </div>
          </div>
        </article>
        <nav aria-label="Browse business categories" className="mx-auto mt-10 max-w-3xl">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Browse businesses by category</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {categories.map((c) => (
              <li key={c.id}><Link href={`/categories/${c.slug}`} className="inline-flex rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-heading transition-colors hover:border-emerald-500">{c.name}</Link></li>
            ))}
          </ul>
        </nav>
        {related.length ? (
          <section className="reveal mt-16">
            <h2 className="mb-6 text-2xl font-semibold">Related articles</h2>
            <ul className="grid gap-6 md:grid-cols-3">{related.map((p) => <li key={p.id}><PostCard post={p} /></li>)}</ul>
          </section>
        ) : null}
      </Container>
    </>
  );
}
