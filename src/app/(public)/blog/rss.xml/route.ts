import { getBlogPosts } from "@/lib/data";
import { env } from "@/lib/env";

export const revalidate = 3600;

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

/** RSS 2.0 feed of published articles (helps discovery by feed readers and search engines). */
export async function GET() {
  const { posts } = await getBlogPosts({ pageSize: 50 });
  const items = posts
    .map((p) => {
      const url = `${env.siteUrl}/blog/${p.slug}`;
      return `<item><title>${esc(p.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><description>${esc(p.excerpt)}</description>${p.published_at ? `<pubDate>${new Date(p.published_at).toUTCString()}</pubDate>` : ""}${p.blog_categories ? `<category>${esc(p.blog_categories.name)}</category>` : ""}</item>`;
    })
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Findora Blog</title><link>${env.siteUrl}/blog</link><description>Practical guides for customers and South African small businesses.</description><language>en-za</language><atom:link href="${env.siteUrl}/blog/rss.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, s-maxage=3600" } });
}
