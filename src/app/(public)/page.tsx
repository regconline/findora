import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Search, MessageSquare, PhoneCall, Store, Eye, BarChart3, BadgeDollarSign, CheckCircle2, MapPin, Building } from "lucide-react";
import { Container, SectionHeading, LinkButton, EmptyState } from "@/components/ui";
import { SearchForm } from "@/components/search-form";
import { BusinessGrid } from "@/components/business-card";
import { CategoryIcon } from "@/components/category-icon";
import { AdSlot } from "@/components/ad-slot";
import { FaqList } from "@/components/faq-list";
import { JsonLd } from "@/components/json-ld";
import { TrackOnMount } from "@/components/track";
import { PostCard } from "@/components/post-card";
import { HeroIllustration } from "@/components/hero-illustration";
import { getBlogPosts, getCategories, getCategoryCounts, getFaqs, getListedLocations, getPopularServices, getRecentBusinesses } from "@/lib/data";
import { env } from "@/lib/env";
import { PROVINCES, SITE } from "@/lib/constants";

export const revalidate = 300;
export const metadata = {
  alternates: { canonical: "/" },
  description: "Search South African businesses by service, category and town. Compare services and prices, then call, WhatsApp or send an enquiry directly. Free listings for businesses.",
};

export default async function HomePage() {
  const [categories, counts, recent, locations, services, { posts }, faqs] = await Promise.all([
    getCategories(),
    getCategoryCounts(),
    getRecentBusinesses(6),
    getListedLocations(),
    getPopularServices(12),
    getBlogPosts({ pageSize: 3 }),
    getFaqs(),
  ]);
  const homeFaqs = faqs.filter((f) => f.show_on_home).slice(0, 6);
  const popularCats = [...categories]
    .sort((a, b) => (counts.byCategory.get(b.id) ?? 0) - (counts.byCategory.get(a.id) ?? 0) || a.sort_order - b.sort_order)
    .slice(0, 12);

  return (
    <>
      <TrackOnMount event={{ type: "platform", event: "home_view" }} />
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: SITE.name,
            url: env.siteUrl,
            logo: `${env.siteUrl}/brand/findora-icon.png`,
            slogan: SITE.tagline,
            areaServed: { "@type": "Country", name: "South Africa" },
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: SITE.name,
            url: env.siteUrl,
            potentialAction: {
              "@type": "SearchAction",
              target: { "@type": "EntryPoint", urlTemplate: `${env.siteUrl}/businesses?q={search_term_string}` },
              "query-input": "required name=search_term_string",
            },
          },
        ]}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-900">
        <div aria-hidden className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:28px_28px]" />
        <Container className="relative pt-14 pb-16 sm:pt-20 sm:pb-24">
          <HeroIllustration className="pointer-events-none absolute right-4 top-10 hidden w-[400px] animate-fade-in xl:block 2xl:w-[440px]" />
          <div className="max-w-3xl animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/85">
              <MapPin className="size-3.5 text-emerald-500" aria-hidden /> Free business discovery across South Africa
            </p>
            <h1 className="mt-5 text-4xl font-bold leading-[1.1] text-white sm:text-5xl lg:text-[3.4rem]">
              Find the Right Business. <span className="text-emerald-500">Connect Directly.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/75">
              Discover businesses, explore services and connect with trusted service providers across South Africa.
            </p>
          </div>
          <div className="relative mt-9 max-w-5xl animate-fade-up [animation-delay:120ms]">
            <SearchForm categories={categories.map((c) => ({ slug: c.slug, name: c.name }))} />
          </div>
          {services.length ? (
            <div className="mt-6 flex flex-wrap items-center gap-2 text-sm animate-fade-up [animation-delay:220ms]">
              <span className="text-white/60">Popular:</span>
              {services.slice(0, 5).map((s) => (
                <Link key={s.slug} href={`/categories/${s.category_slug}/${s.slug}`} className="rounded-full border border-white/15 px-3 py-1 text-white/85 hover:border-white/40 hover:text-white">
                  {s.name}
                </Link>
              ))}
            </div>
          ) : null}
        </Container>
      </section>

      {/* Popular categories */}
      <section className="py-16 sm:py-20">
        <Container>
          <SectionHeading className="reveal" eyebrow="Browse" title="Popular business categories" description="Explore businesses by the type of service you need." action={<LinkButton href="/categories" variant="outline">All categories <ArrowRight /></LinkButton>} />
          <ul className="reveal grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {popularCats.map((c) => {
              const n = counts.byCategory.get(c.id) ?? 0;
              return (
                <li key={c.id}>
                  <Link href={`/categories/${c.slug}`} className="lift group flex h-full items-center gap-3 rounded-card border border-line bg-surface p-4 hover:border-emerald-500/50">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700 transition-colors group-hover:bg-emerald-500 group-hover:text-white">
                      <CategoryIcon name={c.icon} className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold leading-snug text-heading">{c.name}</span>
                      <span className="text-xs text-muted">{n ? `${n} listing${n === 1 ? "" : "s"}` : "Be the first to list"}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Container>
      </section>

      {/* Recently added */}
      <section className="border-y border-line bg-surface py-16 sm:py-20">
        <Container>
          <SectionHeading className="reveal" eyebrow="New on Findora" title="Recently added businesses" action={recent.length ? <LinkButton href="/businesses?sort=recent" variant="outline">View all <ArrowRight /></LinkButton> : undefined} />
          {recent.length ? (
            <BusinessGrid items={recent} />
          ) : (
            <EmptyState icon={Store} title="Be one of the first businesses on Findora" description="Findora is new. Listings appear here as soon as they are approved — create yours today, free of charge." action={<LinkButton href="/list-your-business">List your business</LinkButton>} />
          )}
        </Container>
      </section>

      {/* Locations */}
      <section className="py-16 sm:py-20">
        <Container>
          <SectionHeading className="reveal" eyebrow="Near you" title="Find businesses by location" description="Choose a province or a town to see businesses that serve that area." />
          <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
              {PROVINCES.map((p) => (
                <li key={p}>
                  <Link href={`/businesses?province=${encodeURIComponent(p)}`} className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-sm font-medium text-heading hover:border-emerald-500/50">
                    <MapPin className="size-4 text-emerald-600" aria-hidden /> {p}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="rounded-card border border-line bg-surface p-5">
              <h3 className="text-sm font-semibold">Towns and cities with listings</h3>
              {locations.length ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {locations.slice(0, 24).map((l) => (
                    <li key={`${l.province}-${l.city}`}>
                      <Link href={`/businesses?province=${encodeURIComponent(l.province)}&city=${encodeURIComponent(l.city)}`} className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-3 py-1.5 text-sm text-heading hover:bg-emerald-50">
                        {l.city} <span className="text-xs text-muted">{l.business_count}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted">Towns will appear here as businesses are approved in each area.</p>
              )}
            </div>
          </div>
        </Container>
      </section>

      {/* Popular services */}
      <section className="border-y border-line bg-surface py-16 sm:py-20">
        <Container>
          <SectionHeading className="reveal" eyebrow="Services" title="Popular services" description="Services offered by businesses on Findora." action={<LinkButton href="/services" variant="outline">Services directory <ArrowRight /></LinkButton>} />
          <ul className="flex flex-wrap gap-2">
            {(services.length
              ? services.map((s) => ({ name: s.name, href: `/categories/${s.category_slug}/${s.slug}` }))
              : categories.flatMap((c) => (c.subcategories ?? []).slice(0, 1).map((s) => ({ name: s.name, href: `/categories/${c.slug}/${s.slug}` })))
            ).map((s) => (
              <li key={s.href}>
                <Link href={s.href} className="inline-flex items-center rounded-full border border-line px-4 py-2 text-sm font-medium text-heading hover:border-emerald-500 hover:text-emerald-700">{s.name}</Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <Container className="pt-12"><AdSlot placement="home_mid" /></Container>

      {/* How it works */}
      <section className="py-16 sm:py-20" id="how-it-works">
        <Container>
          <SectionHeading className="reveal" eyebrow="How Findora works" title="From search to conversation in minutes" />
          <ol className="reveal grid gap-4 md:grid-cols-3">
            {[
              { icon: Search, title: "Search", text: "Search by business name, service or keyword, then narrow results by category and location." },
              { icon: Eye, title: "Compare", text: "Review services, prices where provided, operating hours, photos and contact details on each profile." },
              { icon: PhoneCall, title: "Connect directly", text: "Call, WhatsApp, email or send an enquiry. You deal with the business directly — Findora takes no commission." },
            ].map((s, i) => (
              <li key={s.title} className="lift rounded-card border border-line bg-surface p-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-navy-900 text-white"><s.icon className="size-5" aria-hidden /></span>
                  <span className="text-sm font-semibold text-muted">Step {i + 1}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Why join + how to list */}
      <section className="bg-navy-900 py-16 text-white sm:py-20">
        <Container className="grid gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-500">For businesses</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Why list your business on Findora?</h2>
            <ul className="mt-8 space-y-5">
              {[
                { icon: BadgeDollarSign, t: "Free listing", d: "Create a complete business profile with services, photos and contact details at no cost." },
                { icon: Search, t: "Be found on Google", d: "Every approved profile gets its own search-engine-friendly page." },
                { icon: MessageSquare, t: "Receive enquiries", d: "Customers can call, WhatsApp or send enquiries straight to your inbox and dashboard." },
                { icon: BarChart3, t: "See what works", d: "Track profile views, calls, WhatsApp clicks and enquiries from real visitor activity." },
              ].map((x) => (
                <li key={x.t} className="flex gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-emerald-500"><x.icon className="size-5" aria-hidden /></span>
                  <div>
                    <h3 className="font-semibold text-white">{x.t}</h3>
                    <p className="mt-0.5 text-sm text-white/70">{x.d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-surface p-6 text-ink sm:p-8">
            <h2 className="text-2xl font-semibold">Create a free listing in 4 steps</h2>
            <ol className="mt-6 space-y-4">
              {[
                ["Create your account", "Register with your email address and verify it."],
                ["Add your business details", "Description, category, location, hours and contact details."],
                ["Add services and photos", "List what you offer, with prices if you choose, plus your logo and photos."],
                ["Submit for review", "Our team checks the listing and publishes it — usually within two working days."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-50 text-sm font-semibold text-emerald-700">{i + 1}</span>
                  <div>
                    <p className="font-semibold text-heading">{t}</p>
                    <p className="text-sm text-muted">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-7 flex flex-wrap gap-3">
              <LinkButton href="/register/business" size="lg">Create free listing</LinkButton>
              <LinkButton href="/listing-guidelines" size="lg" variant="outline">Listing guidelines</LinkButton>
            </div>
          </div>
        </Container>
      </section>

      {/* Articles */}
      {posts.length ? (
        <section className="py-16 sm:py-20">
          <Container>
            <SectionHeading className="reveal" eyebrow="Learn" title="Latest articles" description="Practical guides for customers and small businesses." action={<LinkButton href="/blog" variant="outline">Visit the blog <ArrowRight /></LinkButton>} />
            <ul className="reveal grid gap-5 md:grid-cols-3">
              {posts.map((p) => (
                <li key={p.id}><PostCard post={p} /></li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}

      {/* FAQ */}
      {homeFaqs.length ? (
        <section className="border-t border-line bg-surface py-16 sm:py-20">
          <Container className="grid gap-10 lg:grid-cols-[1fr_2fr]">
            <div>
              <h2 className="text-3xl font-semibold">Frequently asked questions</h2>
              <p className="mt-3 text-muted">Can&apos;t find what you need? Visit the <Link href="/help" className="text-emerald-700 underline">Help Centre</Link>.</p>
            </div>
            <FaqList faqs={homeFaqs} />
          </Container>
        </section>
      ) : null}

      {/* CTA */}
      <section className="py-16 sm:py-20">
        <Container>
          <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-line bg-surface p-8 sm:flex-row sm:items-center sm:p-10">
            <div className="flex items-start gap-4">
              <Image src="/brand/findora-icon.png" alt="" width={56} height={56} className="hidden size-14 sm:block" />
              <div>
                <h2 className="text-2xl font-semibold">Own a business? Get discovered for free.</h2>
                <p className="mt-1 text-muted">Join Findora and let customers across South Africa find and contact you.</p>
                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink/80">
                  {["No listing fees", "No commission", "Edit anytime"].map((t) => (
                    <li key={t} className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-emerald-600" aria-hidden /> {t}</li>
                  ))}
                </ul>
              </div>
            </div>
            <LinkButton href="/register/business" size="lg" className="shrink-0"><Building /> Register your business</LinkButton>
          </div>
        </Container>
      </section>
    </>
  );
}
