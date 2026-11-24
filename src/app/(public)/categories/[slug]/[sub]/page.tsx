import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CategoryListing } from "@/components/category-listing";
import { getCategoryBySlug, getCategoryCounts, searchBusinesses } from "@/lib/data";
import { PROVINCES } from "@/lib/constants";

type Props = { params: Promise<{ slug: string; sub: string }>; searchParams: Promise<{ page?: string; province?: string }> };
const PAGE = 18;

async function load(slug: string, subSlug: string) {
  const category = await getCategoryBySlug(slug);
  const sub = category?.subcategories?.find((s) => s.slug === subSlug);
  return category && sub ? { category, sub } : null;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug, sub }, sp] = await Promise.all([params, searchParams]);
  const r = await load(slug, sub);
  if (!r) return { title: "Category not found", robots: { index: false } };
  const counts = await getCategoryCounts();
  const n = counts.bySub.get(r.sub.id) ?? 0;
  return {
    title: `${r.sub.name} in South Africa`,
    description: `Find ${r.sub.name.toLowerCase()} near you. Compare services and contact ${r.category.name.toLowerCase()} businesses directly on Findora.`,
    alternates: { canonical: `/categories/${slug}/${sub}` },
    robots: n === 0 || sp.page || sp.province ? { index: false, follow: true } : undefined,
  };
}

export default async function SubcategoryPage({ params, searchParams }: Props) {
  const [{ slug, sub }, sp] = await Promise.all([params, searchParams]);
  const r = await load(slug, sub);
  if (!r) notFound();
  const page = Math.max(1, Number(sp.page) || 1);
  const province = (PROVINCES as readonly string[]).includes(sp.province ?? "") ? sp.province : undefined;
  const [{ results, total }, counts] = await Promise.all([
    searchBusinesses({ category: slug, subcategory: sub, province, page, pageSize: PAGE }),
    getCategoryCounts(),
  ]);
  return <CategoryListing category={r.category} sub={r.sub} results={results} total={total} page={page} pageSize={PAGE} counts={counts.bySub} province={province} />;
}
