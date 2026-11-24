import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBlogCategories, getBlogPosts } from "@/lib/data";
import { BlogIndex } from "@/components/blog-index";

export const revalidate = 300;
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = (await getBlogCategories()).find((c) => c.slug === slug);
  if (!cat) return { title: "Not found", robots: { index: false } };
  return { title: `${cat.name} — Findora Blog`, description: cat.description ?? `Articles about ${cat.name.toLowerCase()} from the Findora blog.`, alternates: { canonical: `/blog/category/${slug}` } };
}

export default async function BlogCategoryPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const cats = await getBlogCategories();
  const cat = cats.find((c) => c.slug === slug);
  if (!cat) notFound();
  const page = Math.max(1, Number(sp.page) || 1);
  const { posts, total } = await getBlogPosts({ page, pageSize: 9, categoryId: cat.id });
  return <BlogIndex title={cat.name} description={cat.description ?? ""} posts={posts} total={total} page={page} cats={cats} base={`/blog/category/${slug}`} activeCat={slug} />;
}
