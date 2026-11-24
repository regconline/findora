import Link from "next/link";
import type { Metadata } from "next";
import { SearchX, SlidersHorizontal, X } from "lucide-react";
import { Container, Breadcrumbs, EmptyState, LinkButton, Pagination } from "@/components/ui";
import { BusinessCard } from "@/components/business-card";
import { SearchForm } from "@/components/search-form";
import { AdSlot } from "@/components/ad-slot";
import { TrackOnMount } from "@/components/track";
import { getCategories, getFeaturedBusinesses, getListedLocations, searchBusinesses } from "@/lib/data";
import { BUSINESS_TYPES, LIMITS, PROVINCES, SORT_OPTIONS } from "@/lib/constants";

type SP = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined, max = 100) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: string | string[] | undefined) => {
  const n = Number(str(v));
  return str(v) && Number.isFinite(n) && n >= 0 ? n : undefined;
};

function parse(sp: SP) {
  const sort = str(sp.sort);
  return {
    q: str(sp.q),
    category: str(sp.category),
    subcategory: str(sp.subcategory),
    province: (PROVINCES as readonly string[]).includes(str(sp.province)) ? str(sp.province) : "",
    city: str(sp.city, 60),
    type: BUSINESS_TYPES.some((t) => t.value === str(sp.type)) ? str(sp.type) : "",
    minPrice: num(sp.min),
    maxPrice: num(sp.max),
    weekends: str(sp.weekends) === "1",
    sort: SORT_OPTIONS.some((s) => s.value === sort) ? sort : "relevance",
    page: Math.max(1, Math.min(500, Math.floor(Number(str(sp.page)) || 1))),
  };
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const p = parse(await searchParams);
  const filtered = Boolean(p.q || p.category || p.subcategory || p.province || p.city || p.type || p.minPrice || p.maxPrice || p.weekends || p.page > 1 || p.sort !== "relevance");
  const title = p.q ? `Search results for “${p.q}”` : p.province ? `Businesses in ${p.city ? `${p.city}, ` : ""}${p.province}` : "Explore businesses in South Africa";
  return {
    title,
    description: "Search and browse South African businesses by service, category and location. Contact businesses directly on Findora.",
    alternates: { canonical: "/businesses" },
    // Filter combinations are not indexed to avoid thin, duplicate URLs.
    robots: filtered ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function BusinessesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const p = parse(await searchParams);
  const pageSize = LIMITS.searchPageSize;
  const [categories, locations, { results, total }, featured] = await Promise.all([
    getCategories(),
    getListedLocations(),
    searchBusinesses({ ...p, pageSize }),
    p.page === 1 ? getFeaturedBusinesses(6) : Promise.resolve([]),
  ]);
  const cat = categories.find((c) => c.slug === p.category);
  const featuredHere = featured.filter((f) => (!p.category || f.category_slug === p.category) && (!p.province || f.province === p.province)).slice(0, 3);
  const pages = Math.ceil(total / pageSize);
  const cities = locations.filter((l) => !p.province || l.province === p.province);

  const qs = (over: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    const base: Record<string, string | number | undefined> = {
      q: p.q, category: p.category, subcategory: p.subcategory, province: p.province, city: p.city, type: p.type,
      min: p.minPrice, max: p.maxPrice, weekends: p.weekends ? "1" : undefined, sort: p.sort === "relevance" ? undefined : p.sort,
    };
    for (const [k, v] of Object.entries({ ...base, ...over })) if (v !== undefined && v !== "" && v !== null) u.set(k, String(v));
    const s = u.toString();
    return `/businesses${s ? `?${s}` : ""}`;
  };

  const chips = [
    p.q && { label: `“${p.q}”`, href: qs({ q: undefined }) },
    cat && { label: cat.name, href: qs({ category: undefined, subcategory: undefined }) },
    p.subcategory && { label: cat?.subcategories?.find((s) => s.slug === p.subcategory)?.name ?? p.subcategory, href: qs({ subcategory: undefined }) },
    p.province && { label: p.province, href: qs({ province: undefined, city: undefined }) },
    p.city && { label: p.city, href: qs({ city: undefined }) },
    p.type && { label: BUSINESS_TYPES.find((t) => t.value === p.type)?.label ?? p.type, href: qs({ type: undefined }) },
    (p.minPrice != null || p.maxPrice != null) && { label: `R${p.minPrice ?? 0} – ${p.maxPrice != null ? `R${p.maxPrice}` : "any"}`, href: qs({ min: undefined, max: undefined }) },
    p.weekends && { label: "Open weekends", href: qs({ weekends: undefined }) },
  ].filter(Boolean) as { label: string; href: string }[];

  const filters = (
    <form action="/businesses" method="get" className="space-y-5">
      {p.q ? <input type="hidden" name="q" value={p.q} /> : null}
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-navy-900">Category</span>
        <select name="category" defaultValue={p.category} className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
      </label>
      {cat?.subcategories?.length ? (
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-navy-900">Subcategory</span>
          <select name="subcategory" defaultValue={p.subcategory} className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm">
            <option value="">All in {cat.name}</option>
            {cat.subcategories.map((s) => <option key={s.id} value={s.slug}>{s.name}</option>)}
          </select>
        </label>
      ) : null}
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-navy-900">Province</span>
        <select name="province" defaultValue={p.province} className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm">
          <option value="">All provinces</option>
          {PROVINCES.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-navy-900">City or town</span>
        <input name="city" defaultValue={p.city} list="city-options" placeholder="Any" className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm" />
        <datalist id="city-options">{cities.slice(0, 200).map((l) => <option key={`${l.province}-${l.city}`} value={l.city} />)}</datalist>
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-navy-900">Business type</span>
        <select name="type" defaultValue={p.type} className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm">
          <option value="">Any type</option>
          {BUSINESS_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </label>
      <fieldset className="text-sm">
        <legend className="mb-1.5 font-medium text-navy-900">Service price (R)</legend>
        <div className="grid grid-cols-2 gap-2">
          <input name="min" type="number" min={0} inputMode="numeric" defaultValue={p.minPrice} placeholder="Min" aria-label="Minimum price" className="h-10 rounded-lg border border-line bg-white px-3" />
          <input name="max" type="number" min={0} inputMode="numeric" defaultValue={p.maxPrice} placeholder="Max" aria-label="Maximum price" className="h-10 rounded-lg border border-line bg-white px-3" />
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="weekends" value="1" defaultChecked={p.weekends} className="size-4 accent-emerald-600" /> Open on weekends
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-navy-900">Sort by</span>
        <select name="sort" defaultValue={p.sort} className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm">
          {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </label>
      <div className="flex gap-2">
        <button className="h-10 flex-1 rounded-lg bg-navy-900 text-sm font-semibold text-white hover:bg-navy-800">Apply filters</button>
        <Link href={p.q ? `/businesses?q=${encodeURIComponent(p.q)}` : "/businesses"} className="grid h-10 place-items-center rounded-lg border border-line px-3 text-sm font-medium text-navy-900 hover:bg-canvas">Clear</Link>
      </div>
    </form>
  );

  return (
    <>
      {p.q ? <TrackOnMount event={{ type: "platform", event: "search", query: p.q, result_count: total }} /> : null}
      <div className="border-b border-line bg-white">
        <Container className="py-6">
          <Breadcrumbs items={[{ label: "Explore businesses" }]} />
          <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{p.q ? <>Results for “{p.q}”</> : cat ? `${cat.name} businesses` : "Explore businesses"}</h1>
          <div className="mt-5"><SearchForm variant="compact" categories={categories.map((c) => ({ slug: c.slug, name: c.name }))} defaults={{ q: p.q, category: p.category, province: p.province }} /></div>
        </Container>
      </div>
      <Container className="py-8">
        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside aria-label="Filters">
            <details className="group rounded-card border border-line bg-white lg:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold text-navy-900">
                <span className="flex items-center gap-2"><SlidersHorizontal className="size-4" aria-hidden /> Filters {chips.length ? `(${chips.length})` : ""}</span>
                <span className="text-sm font-normal text-muted group-open:hidden">Show</span><span className="hidden text-sm font-normal text-muted group-open:inline">Hide</span>
              </summary>
              <div className="border-t border-line p-4">{filters}</div>
            </details>
            <div className="hidden rounded-card border border-line bg-white p-5 lg:block">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal className="size-4" aria-hidden /> Filter results</h2>
              {filters}
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted" aria-live="polite">
                {total ? <><strong className="text-navy-900">{total.toLocaleString("en-ZA")}</strong> business{total === 1 ? "" : "es"} found</> : "No businesses found"}
              </p>
              {chips.length ? (
                <ul className="flex flex-wrap gap-2">
                  {chips.map((c) => (
                    <li key={c.label}>
                      <Link href={c.href} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-navy-900 ring-1 ring-line hover:ring-navy-900/30">
                        {c.label} <X className="size-3" aria-label="Remove filter" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {featuredHere.length ? (
              <section aria-labelledby="featured-h" className="mb-6 rounded-card border border-amber-500/30 bg-amber-100/30 p-4">
                <h2 id="featured-h" className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#8a5a10]">Featured listings</h2>
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {featuredHere.map((b) => <li key={b.id}><BusinessCard b={b} label="featured" /></li>)}
                </ul>
              </section>
            ) : null}

            {results.length ? (
              <>
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {results.slice(0, 6).map((b) => <li key={b.id}><BusinessCard b={b} trackSearch={Boolean(p.q)} /></li>)}
                </ul>
                {results.length > 6 ? <AdSlot placement="search_results" className="my-6" /> : null}
                {results.length > 6 ? (
                  <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {results.slice(6).map((b) => <li key={b.id}><BusinessCard b={b} trackSearch={Boolean(p.q)} /></li>)}
                  </ul>
                ) : null}
                <Pagination className="mt-10" page={p.page} pages={pages} hrefFor={(n) => qs({ page: n > 1 ? n : undefined })} />
              </>
            ) : (
              <EmptyState
                icon={SearchX}
                title="No businesses match your search"
                description={
                  p.q
                    ? "Try a shorter or more general term (e.g. “plumber” instead of “emergency geyser plumber”), check the spelling, or remove some filters."
                    : "There are no approved listings for these filters yet. Try a nearby town or a wider area."
                }
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    {chips.length ? <LinkButton href="/businesses" variant="outline">Clear all filters</LinkButton> : null}
                    <LinkButton href="/categories" variant="outline">Browse categories</LinkButton>
                    <LinkButton href="/list-your-business">List your business</LinkButton>
                  </div>
                }
              />
            )}
          </div>
        </div>
      </Container>
    </>
  );
}
