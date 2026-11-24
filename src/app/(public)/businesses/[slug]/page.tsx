import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Container, Breadcrumbs, Card, SectionHeading } from "@/components/ui";
import { BusinessHeader, BusinessBody, BusinessSidebar, ContactActions } from "@/components/business-profile";
import { BusinessGrid } from "@/components/business-card";
import { EnquiryForm } from "@/components/enquiry-form";
import { SaveButton } from "@/components/save-button";
import { ShareButton } from "@/components/share-button";
import { TrackOnMount } from "@/components/track";
import { AdSlot } from "@/components/ad-slot";
import { JsonLd } from "@/components/json-ld";
import { Turnstile } from "@/components/turnstile";
import { getBusinessBySlug, getSimilarBusinesses } from "@/lib/data";
import { env } from "@/lib/env";
import { BUCKETS } from "@/lib/constants";
import { plainText, storageUrl } from "@/lib/utils";

export const revalidate = 300;
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const b = await getBusinessBySlug(slug);
  if (!b) return { title: "Business not found", robots: { index: false } };
  const where = b.location ? ` in ${b.location.city}` : "";
  const what = b.subcategory?.name ?? b.category?.name ?? "Business";
  const image = storageUrl(BUCKETS.covers, b.cover_path) ?? storageUrl(BUCKETS.logos, b.logo_path);
  const description = plainText(b.tagline ? `${b.tagline}. ${b.description}` : b.description, 158);
  return {
    title: `${b.name} — ${what}${where}`,
    description,
    alternates: { canonical: `/businesses/${b.slug}` },
    openGraph: { type: "profile", title: b.name, description, url: `/businesses/${b.slug}`, ...(image ? { images: [{ url: image }] } : {}) },
  };
}

export default async function BusinessPage({ params }: Props) {
  const { slug } = await params;
  const b = await getBusinessBySlug(slug);
  if (!b) notFound();
  const similar = await getSimilarBusinesses(b, 3);
  const url = `${env.siteUrl}/businesses/${b.slug}`;
  const l = b.location;

  // LocalBusiness structured data — only facts supplied by the business (no ratings/reviews).
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": url,
    name: b.name,
    url,
    description: plainText(b.description, 500),
    ...(b.logo_path ? { logo: storageUrl(BUCKETS.logos, b.logo_path) } : {}),
    ...(b.logo_path || b.cover_path ? { image: [storageUrl(BUCKETS.covers, b.cover_path), storageUrl(BUCKETS.logos, b.logo_path)].filter(Boolean) } : {}),
    ...(b.contact_publish_consent && b.phone ? { telephone: b.phone } : {}),
    ...(b.contact_publish_consent && b.email ? { email: b.email } : {}),
    ...(l
      ? {
          address: {
            "@type": "PostalAddress",
            ...(l.show_street_address && l.street_address ? { streetAddress: l.street_address } : {}),
            addressLocality: l.city,
            addressRegion: l.province,
            ...(l.postal_code ? { postalCode: l.postal_code } : {}),
            addressCountry: "ZA",
          },
          ...(l.latitude != null && l.longitude != null ? { geo: { "@type": "GeoCoordinates", latitude: l.latitude, longitude: l.longitude } } : {}),
          ...(l.service_areas.length ? { areaServed: l.service_areas } : {}),
        }
      : {}),
    ...(b.year_established ? { foundingDate: String(b.year_established) } : {}),
    sameAs: [b.website, b.facebook_url, b.instagram_url, b.tiktok_url, b.linkedin_url].filter(Boolean),
    ...(b.hours.some((h) => !h.is_closed)
      ? {
          openingHoursSpecification: b.hours
            .filter((h) => !h.is_closed && h.opens_at && h.closes_at)
            .map((h) => ({
              "@type": "OpeningHoursSpecification",
              dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][h.day_of_week],
              opens: h.opens_at!.slice(0, 5),
              closes: h.closes_at!.slice(0, 5),
            })),
        }
      : {}),
    ...(b.services.length
      ? {
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Services",
            itemListElement: b.services.slice(0, 30).map((s) => ({
              "@type": "Offer",
              itemOffered: { "@type": "Service", name: s.name, ...(s.description ? { description: s.description } : {}) },
              ...(s.price != null && ["fixed", "starting_from"].includes(s.price_type) ? { price: Number(s.price), priceCurrency: "ZAR" } : {}),
            })),
          },
        }
      : {}),
  };

  return (
    <>
      <TrackOnMount event={{ type: "view", business_id: b.id }} />
      <JsonLd data={ld} />
      <BusinessHeader b={b} actions={<><SaveButton businessId={b.id} slug={b.slug} /><ShareButton title={b.name} /></>} />
      <Container className="py-8">
        <Breadcrumbs
          className="mb-6"
          items={[
            { label: "Businesses", href: "/businesses" },
            ...(b.category ? [{ label: b.category.name, href: `/categories/${b.category.slug}` }] : []),
            { label: b.name },
          ]}
        />
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="min-w-0 space-y-6">
            <div className="lg:hidden"><ContactActions b={b} /></div>
            <BusinessBody b={b} />
            <AdSlot placement="business_profile" />
            <Card className="scroll-mt-24 p-6" id="enquiry">
              <h2 className="text-lg font-semibold">Send an enquiry to {b.name}</h2>
              <p className="mt-1 mb-5 text-sm text-muted">The business will reply to you directly by email or phone.</p>
              <EnquiryForm businessId={b.id} businessName={b.name} services={b.services.map((s) => ({ id: s.id, name: s.name }))} turnstile={<Turnstile />} />
            </Card>
          </div>
          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <Card className="hidden p-5 lg:block">
              <ContactActions b={b} />
            </Card>
            <BusinessSidebar b={b} />
          </div>
        </div>
        {similar.length ? (
          <section className="mt-14">
            <SectionHeading title="Similar businesses" description={b.category ? `More ${b.category.name.toLowerCase()} businesses${l ? ` in ${l.province}` : ""}.` : undefined} />
            <BusinessGrid items={similar} />
          </section>
        ) : null}
      </Container>
    </>
  );
}
