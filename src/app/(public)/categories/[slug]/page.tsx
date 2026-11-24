import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CategoryListing } from "@/components/category-listing";
import { getCategories, getCategoryBySlug, getCategoryCounts, searchBusinesses } from "@/lib/data";
import { PROVINCES } from "@/lib/constants";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string; province?: string }> };
const PAGE = 18;

export async function generateStaticParams() {
  return (await getCategories()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const c = await getCategoryBySlug(slug);
  if (!c) return { title: "Category not found", robots: { index: false } };
  const counts = await getCategoryCounts();
  const n = counts.byCategory.get(c.id) ?? 0;
  return {
    title: c.seo_title || `${c.name} in South Africa`,
    description: c.seo_description || `Find ${c.name.toLowerCase()} businesses across South Africa. ${c.description ?? ""}`.trim(),
    alternates: { canonical: `/categories/${c.slug}` },
    // Empty categories and filtered/paginated variants are not indexed (avoids thin pages).
    robots: n === 0 || sp.page || sp.province ? { index: false, follow: true } : undefined,
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();
  const page = Math.max(1, Number(sp.page) || 1);
  const province = (PROVINCES as readonly string[]).includes(sp.province ?? "") ? sp.province : undefined;
  const [{ results, total }, counts] = await Promise.all([
    searchBusinesses({ category: slug, province, page, pageSize: PAGE, sort: "relevance" }),
    getCategoryCounts(),
  ]);
  return <CategoryListing category={category} results={results} total={total} page={page} pageSize={PAGE} counts={counts.bySub} province={province} />;
}
