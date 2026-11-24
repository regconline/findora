import Link from "next/link";
import { Store } from "lucide-react";
import { Container, Breadcrumbs, EmptyState, LinkButton, Pagination, SectionHeading } from "@/components/ui";
import { BusinessGrid } from "@/components/business-card";
import { CategoryIcon } from "@/components/category-icon";
import { AdSlot } from "@/components/ad-slot";
import { TrackOnMount } from "@/components/track";
import { cn } from "@/lib/utils";
import { PROVINCES } from "@/lib/constants";
import type { Category, SearchResult, Subcategory } from "@/lib/types";

export function CategoryListing({
  category, sub, results, total, page, pageSize, counts, province,
}: {
  category: Category;
  sub?: Subcategory;
  results: SearchResult[];
  total: number;
  page: number;
  pageSize: number;
  counts: Map<string, number>;
  province?: string;
}) {
  const base = `/categories/${category.slug}${sub ? `/${sub.slug}` : ""}`;
  const title = sub ? sub.name : category.name;
  const href = (p: number, prov = province) => {
    const u = new URLSearchParams();
    if (p > 1) u.set("page", String(p));
    if (prov) u.set("province", prov);
    const s = u.toString();
    return s ? `${base}?${s}` : base;
  };
  return (
    <>
      <TrackOnMount event={{ type: "platform", event: "category_view", ref_id: sub?.id ?? category.id }} />
      <div className="border-b border-line bg-white">
        <Container className="py-8">
          <Breadcrumbs items={[{ label: "Categories", href: "/categories" }, ...(sub ? [{ label: category.name, href: `/categories/${category.slug}` }] : []), { label: title }]} />
          <div className="mt-5 flex items-start gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><CategoryIcon name={category.icon} className="size-7" /></span>
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">{title} in South Africa</h1>
              <p className="mt-1.5 max-w-2xl text-muted">{sub?.description || (sub ? `Find ${sub.name.toLowerCase()} listed under ${category.name} on Findora and contact them directly.` : category.description)}</p>
            </div>
          </div>
          {!sub && category.subcategories?.length ? (
            <ul className="mt-6 flex flex-wrap gap-2">
              {category.subcategories.map((s) => (
                <li key={s.id}>
                  <Link href={`/categories/${category.slug}/${s.slug}`} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm text-navy-900 hover:border-emerald-500">
                    {s.name} {counts.get(s.id) ? <span className="text-xs text-muted">{counts.get(s.id)}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          <nav aria-label="Filter by province" className="mt-5 flex flex-wrap gap-1.5 text-sm">
            <Link href={href(1, "")} className={cn("rounded-lg px-2.5 py-1", !province ? "bg-navy-900 text-white" : "text-muted hover:bg-canvas")}>All provinces</Link>
            {PROVINCES.map((p) => (
              <Link key={p} href={href(1, p)} rel="nofollow" className={cn("rounded-lg px-2.5 py-1", province === p ? "bg-navy-900 text-white" : "text-muted hover:bg-canvas")}>{p}</Link>
            ))}
          </nav>
        </Container>
      </div>
      <Container className="py-10">
        <SectionHeading title={total ? `${total} ${title.toLowerCase()} listing${total === 1 ? "" : "s"}${province ? ` in ${province}` : ""}` : `No ${title.toLowerCase()} listings yet`} className="mb-6" />
        {results.length ? (
          <>
            <BusinessGrid items={results.slice(0, 9)} />
            {results.length > 9 ? <AdSlot placement="category_page" className="my-8" /> : null}
            {results.length > 9 ? <BusinessGrid items={results.slice(9)} /> : null}
            <Pagination className="mt-10" page={page} pages={Math.ceil(total / pageSize)} hrefFor={(p) => href(p)} />
          </>
        ) : (
          <EmptyState
            icon={Store}
            title={`Be the first ${sub ? sub.name.toLowerCase().replace(/s$/, "") : category.name.toLowerCase()} business listed${province ? ` in ${province}` : ""}`}
            description="Listings are free. Customers searching this category will be able to find and contact you directly."
            action={<div className="flex flex-wrap justify-center gap-2"><LinkButton href="/register/business">List your business</LinkButton><LinkButton href="/businesses" variant="outline">Explore other businesses</LinkButton></div>}
          />
        )}
        {results.length > 0 && results.length <= 9 ? <AdSlot placement="category_page" className="mt-10" /> : null}
      </Container>
    </>
  );
}
