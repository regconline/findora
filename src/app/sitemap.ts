import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { getAllBusinessSlugs, getAllPostSlugs, getBlogCategories, getCategories, getCategoryCounts, getSitePages } from "@/lib/data";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const u = (p: string) => `${env.siteUrl}${p}`;
  const [categories, counts, businesses, posts, pages, blogCats] = await Promise.all([
    getCategories(), getCategoryCounts(), getAllBusinessSlugs(), getAllPostSlugs(), getSitePages(), getBlogCategories(),
  ]);
  const now = new Date();
  const fixed = ["", "/businesses", "/categories", "/services", "/how-it-works", "/list-your-business", "/help", "/faq", "/contact", "/blog", "/site-map"];
  return [
    ...fixed.map((p) => ({ url: u(p || "/"), lastModified: now, changeFrequency: "daily" as const, priority: p === "" ? 1 : 0.7 })),
    ...pages.filter((p) => !fixed.includes(`/${p.slug}`)).map((p) => ({ url: u(`/${p.slug}`), lastModified: new Date(p.updated_at), changeFrequency: "monthly" as const, priority: 0.3 })),
    // Only categories/subcategories that have approved listings (no thin pages)
    ...categories.filter((c) => (counts.byCategory.get(c.id) ?? 0) > 0).map((c) => ({ url: u(`/categories/${c.slug}`), changeFrequency: "daily" as const, priority: 0.8 })),
    ...categories.flatMap((c) =>
      (c.subcategories ?? []).filter((s) => (counts.bySub.get(s.id) ?? 0) > 0).map((s) => ({ url: u(`/categories/${c.slug}/${s.slug}`), changeFrequency: "daily" as const, priority: 0.7 })),
    ),
    ...businesses.map((b) => ({ url: u(`/businesses/${b.slug}`), lastModified: new Date(b.updated_at), changeFrequency: "weekly" as const, priority: 0.8 })),
    ...posts.map((p) => ({ url: u(`/blog/${p.slug}`), lastModified: new Date(p.updated_at), changeFrequency: "monthly" as const, priority: 0.6, ...(p.cover_image_url ? { images: [p.cover_image_url.startsWith("/") ? u(p.cover_image_url) : p.cover_image_url] } : {}) })),
    ...blogCats.map((c) => ({ url: u(`/blog/category/${c.slug}`), changeFrequency: "weekly" as const, priority: 0.4 })),
  ];
}
