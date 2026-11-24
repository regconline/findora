import Link from "next/link";
import type { Metadata } from "next";
import { Container, Breadcrumbs } from "@/components/ui";
import { CategoryIcon } from "@/components/category-icon";
import { getCategories, getCategoryCounts } from "@/lib/data";

export const revalidate = 600;
export const metadata: Metadata = {
  title: "Business categories",
  description: "Browse South African businesses by category — healthcare, automotive, construction, beauty, professional services and more.",
  alternates: { canonical: "/categories" },
};

export default async function CategoriesPage() {
  const [categories, counts] = await Promise.all([getCategories(), getCategoryCounts()]);
  return (
    <Container className="py-10">
      <Breadcrumbs items={[{ label: "Categories" }]} />
      <h1 className="mt-4 text-3xl font-bold">Business categories</h1>
      <p className="mt-2 max-w-2xl text-muted">Find the right type of business, then narrow down by subcategory and location.</p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => {
          const n = counts.byCategory.get(c.id) ?? 0;
          return (
            <li key={c.id} className="rounded-card border border-line bg-white p-5">
              <Link href={`/categories/${c.slug}`} className="group flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-500 group-hover:text-white">
                  <CategoryIcon name={c.icon} className="size-5" />
                </span>
                <span>
                  <span className="block font-semibold text-navy-900 group-hover:text-emerald-700">{c.name}</span>
                  <span className="text-xs text-muted">{n} listing{n === 1 ? "" : "s"}</span>
                </span>
              </Link>
              {c.subcategories?.length ? (
                <ul className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5 text-sm">
                  {c.subcategories.map((s) => (
                    <li key={s.id}>
                      <Link href={`/categories/${c.slug}/${s.slug}`} className="text-ink/75 hover:text-emerald-700 hover:underline">{s.name}</Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Container>
  );
}
