import Link from "next/link";
import type { Metadata } from "next";
import { Container, Breadcrumbs, SectionHeading } from "@/components/ui";
import { CategoryIcon } from "@/components/category-icon";
import { getCategories, getPopularServices } from "@/lib/data";

export const revalidate = 600;
export const metadata: Metadata = {
  title: "Services directory",
  description: "Browse services offered by South African businesses on Findora — from plumbing and panel beating to accounting, tutoring and catering.",
  alternates: { canonical: "/services" },
};

export default async function ServicesPage() {
  const [categories, popular] = await Promise.all([getCategories(), getPopularServices(16)]);
  return (
    <Container className="py-10">
      <Breadcrumbs items={[{ label: "Services" }]} />
      <h1 className="mt-4 text-3xl font-bold">Services directory</h1>
      <p className="mt-2 max-w-2xl text-muted">Find the service you need and see which businesses offer it, with prices where they have chosen to publish them.</p>

      {popular.length ? (
        <section className="mt-10">
          <SectionHeading title="Most listed services" className="mb-4" />
          <ul className="flex flex-wrap gap-2">
            {popular.map((s) => (
              <li key={s.slug}>
                <Link href={`/services/${s.slug}`} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-heading hover:border-emerald-500">
                  {s.name} <span className="text-xs text-muted">{s.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-12 columns-1 gap-6 sm:columns-2 lg:columns-3">
        {categories.map((c) => (
          <div key={c.id} className="mb-6 break-inside-avoid rounded-card border border-line bg-surface p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <CategoryIcon name={c.icon} className="size-4 text-emerald-600" /> {c.name}
            </h2>
            <ul className="mt-3 space-y-1.5 text-sm">
              {(c.subcategories ?? []).map((s) => (
                <li key={s.id}><Link href={`/services/${s.slug}`} className="text-ink/80 hover:text-emerald-700 hover:underline">{s.name}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </Container>
  );
}
