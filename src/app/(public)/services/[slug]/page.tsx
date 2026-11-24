import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Tag } from "lucide-react";
import { Container, Breadcrumbs, EmptyState, LinkButton, Pagination } from "@/components/ui";
import { BusinessLogo } from "@/components/business-card";
import { TrackedLink } from "@/components/track";
import { findSubcategory, getServicesForSubcategory } from "@/lib/data";
import { formatPrice } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };
const PAGE = 24;

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const r = await findSubcategory(slug);
  if (!r) return { title: "Service not found", robots: { index: false } };
  const { total } = await getServicesForSubcategory(r.sub.id, 1, 1);
  return {
    title: `${r.sub.name} services and prices`,
    description: `Compare ${r.sub.name.toLowerCase()} services offered by South African businesses on Findora, with prices where published.`,
    alternates: { canonical: `/services/${slug}` },
    robots: total === 0 || sp.page ? { index: false, follow: true } : undefined,
  };
}

export default async function ServicePage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const r = await findSubcategory(slug);
  if (!r) notFound();
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows, total } = await getServicesForSubcategory(r.sub.id, page, PAGE);
  return (
    <Container className="py-10">
      <Breadcrumbs items={[{ label: "Services", href: "/services" }, { label: r.sub.name }]} />
      <h1 className="mt-4 text-3xl font-bold">{r.sub.name}</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Services listed by businesses on Findora. Prices are set by each business — always confirm before booking.{" "}
        <Link href={`/categories/${r.category.slug}/${r.sub.slug}`} className="text-emerald-700 underline">See all {r.sub.name.toLowerCase()} businesses</Link>.
      </p>
      {rows.length ? (
        <>
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {rows.map((s) => {
              const loc = s.business.business_locations?.[0];
              return (
                <li key={s.id} className="relative flex gap-4 rounded-card border border-line bg-white p-5">
                  <BusinessLogo path={s.business.logo_path} name={s.business.name} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="font-semibold text-navy-900">{s.name}</h2>
                      <span className="text-sm font-semibold text-emerald-700">{formatPrice(s.price, s.price_type)}</span>
                    </div>
                    <p className="text-sm text-muted">
                      <TrackedLink href={`/businesses/${s.business.slug}#services`} event={{ type: "view", business_id: s.business_id, service_id: s.id }} className="font-medium text-navy-900 after:absolute after:inset-0 hover:underline">{s.business.name}</TrackedLink>
                      {loc ? ` · ${loc.city}, ${loc.province}` : ""}
                    </p>
                    {s.description ? <p className="mt-2 line-clamp-2 text-sm text-ink/80">{s.description}</p> : null}
                  </div>
                </li>
              );
            })}
          </ul>
          <Pagination className="mt-10" page={page} pages={Math.ceil(total / PAGE)} hrefFor={(p) => (p > 1 ? `/services/${slug}?page=${p}` : `/services/${slug}`)} />
        </>
      ) : (
        <EmptyState className="mt-8" icon={Tag} title={`No ${r.sub.name.toLowerCase()} services listed yet`} description="Offer this service? Add it to your free Findora listing." action={<LinkButton href="/register/business">List your business</LinkButton>} />
      )}
    </Container>
  );
}
