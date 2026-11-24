import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Clock, Globe, Mail, MapPin, Navigation, Phone, Flag, Building, CalendarDays, Hash } from "lucide-react";
import { FacebookIcon, InstagramIcon, LinkedinIcon, TiktokIcon } from "@/components/brand-icons";
import { Badge, Card } from "@/components/ui";
import { BusinessLogo } from "@/components/business-card";
import { ContactAnchor } from "@/components/track";
import { BUSINESS_TYPES, BUCKETS, DAYS } from "@/lib/constants";
import { cn, displayHost, formatPhone, formatPrice, storageUrl, telLink, whatsappLink } from "@/lib/utils";
import type { BusinessProfile } from "@/lib/data";

export function directionsUrl(b: BusinessProfile) {
  const l = b.location;
  if (!l) return null;
  if (l.latitude != null && l.longitude != null) return `https://www.google.com/maps/dir/?api=1&destination=${l.latitude},${l.longitude}`;
  const parts = [l.show_street_address ? l.street_address : null, l.suburb, l.city, l.province, "South Africa"].filter(Boolean).join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${b.name}, ${parts}`)}`;
}

export function addressLines(b: BusinessProfile) {
  const l = b.location;
  if (!l) return [];
  return [l.show_street_address ? l.street_address : null, [l.suburb, l.town].filter(Boolean).join(", "), [l.city, l.postal_code].filter(Boolean).join(" "), l.province].filter(
    (x): x is string => Boolean(x),
  );
}

function fmtTime(t: string | null) {
  return t ? t.slice(0, 5) : "";
}

/** Contact actions: Call, WhatsApp, Email, Website, Directions — each tracked. */
export function ContactActions({ b, preview = false, enquiryHref = "#enquiry" }: { b: BusinessProfile; preview?: boolean; enquiryHref?: string }) {
  const show = b.contact_publish_consent;
  const dir = directionsUrl(b);
  const btn = "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors [&_svg]:size-4";
  const ev = (event: "phone" | "whatsapp" | "email" | "website" | "directions") => ({ type: "contact" as const, business_id: b.id, event });
  const wrap = (node: React.ReactNode) => (preview ? <span className="pointer-events-none">{node}</span> : node);
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {show && b.phone ? wrap(<ContactAnchor href={telLink(b.phone)} event={ev("phone")} className={cn(btn, "bg-navy-900 text-white hover:bg-navy-800")}><Phone aria-hidden /> Call Now</ContactAnchor>) : null}
      {show && b.whatsapp
        ? wrap(<ContactAnchor href={whatsappLink(b.whatsapp, `Hi ${b.name}, I found you on Findora.`)} target="_blank" rel="noopener" event={ev("whatsapp")} className={cn(btn, "bg-[#1f9e57] text-white hover:bg-[#1a8a4c]")}>
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.7 1.2 1.6 2 1.1 1 2 1.3 2.3 1.4.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l2 1c.3.1.5.2.5.3.1.1.1.6-.1 1.2z" /></svg>
            WhatsApp
          </ContactAnchor>)
        : null}
      <a href={enquiryHref} className={cn(btn, "bg-emerald-500 text-white hover:bg-emerald-600", preview && "pointer-events-none")}><Mail aria-hidden /> Send Enquiry</a>
      {show && b.email ? wrap(<ContactAnchor href={`mailto:${b.email}`} event={ev("email")} className={cn(btn, "border border-line bg-surface text-heading hover:bg-canvas")}><Mail aria-hidden /> Email</ContactAnchor>) : null}
      {b.website ? wrap(<ContactAnchor href={b.website} target="_blank" rel="noopener nofollow" event={ev("website")} className={cn(btn, "border border-line bg-surface text-heading hover:bg-canvas")}><Globe aria-hidden /> Visit Website</ContactAnchor>) : null}
      {dir ? wrap(<ContactAnchor href={dir} target="_blank" rel="noopener" event={ev("directions")} className={cn(btn, "border border-line bg-surface text-heading hover:bg-canvas")}><Navigation aria-hidden /> Get Directions</ContactAnchor>) : null}
    </div>
  );
}

export function BusinessHeader({ b, actions }: { b: BusinessProfile; actions?: React.ReactNode }) {
  const cover = storageUrl(BUCKETS.covers, b.cover_path);
  const loc = b.location;
  return (
    <div>
      <div className="relative aspect-[16/6] max-h-[340px] w-full overflow-hidden bg-navy-900 sm:aspect-[16/5]">
        {cover ? (
          <Image src={cover} alt={`${b.name} cover photo`} fill priority sizes="100vw" className="object-cover" />
        ) : (
          <div aria-hidden className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:26px_26px]" />
        )}
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <BusinessLogo path={b.logo_path} name={b.name} size={104} className="border-4 border-white shadow-card" />
            <div className="pb-1">
              <div className="flex flex-wrap items-center gap-2">
                {b.category ? (
                  <Link href={`/categories/${b.category.slug}${b.subcategory ? `/${b.subcategory.slug}` : ""}`} className="text-sm font-medium text-emerald-700 hover:underline">
                    {b.subcategory?.name ?? b.category.name}
                  </Link>
                ) : null}
                {b.is_featured ? <Badge tone="sponsored">Featured</Badge> : null}
              </div>
              <h1 className="mt-0.5 text-2xl font-bold sm:text-3xl">
                {b.name}
                {b.is_verified ? <BadgeCheck className="ml-1.5 inline size-6 align-[-3px] text-emerald-600" aria-label="Verified by Findora" /> : null}
              </h1>
              {loc ? (
                <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                  <MapPin className="size-4" aria-hidden /> {[loc.suburb, loc.city, loc.province].filter(Boolean).join(", ")}
                </p>
              ) : null}
            </div>
          </div>
          {actions ? <div className="flex gap-2 sm:pb-1">{actions}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function BusinessBody({ b }: { b: BusinessProfile }) {
  const type = BUSINESS_TYPES.find((t) => t.value === b.business_type)?.label;
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-lg font-semibold">About {b.name}</h2>
        {b.tagline ? <p className="mt-2 font-medium text-heading">{b.tagline}</p> : null}
        <div className="mt-3 whitespace-pre-line leading-relaxed text-ink/85">{b.description}</div>
        <dl className="mt-5 grid gap-3 border-t border-line pt-5 text-sm sm:grid-cols-3">
          {type ? (<div className="flex items-center gap-2"><Building className="size-4 text-muted" aria-hidden /><dt className="sr-only">Business type</dt><dd>{type}</dd></div>) : null}
          {b.year_established ? (<div className="flex items-center gap-2"><CalendarDays className="size-4 text-muted" aria-hidden /><dt className="sr-only">Established</dt><dd>Established {b.year_established}</dd></div>) : null}
          {b.show_registration_number && b.registration_number ? (<div className="flex items-center gap-2"><Hash className="size-4 text-muted" aria-hidden /><dt>Reg. no.</dt><dd>{b.registration_number}</dd></div>) : null}
        </dl>
      </Card>

      <Card className="p-6" id="services">
        <h2 className="text-lg font-semibold">Services</h2>
        {b.services.length ? (
          <ul className="mt-4 divide-y divide-line">
            {b.services.map((s) => {
              const img = storageUrl(BUCKETS.gallery, s.image_path);
              return (
                <li key={s.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                  {img ? <Image src={img} alt={s.name} width={80} height={80} sizes="80px" className="size-20 shrink-0 rounded-lg object-cover" /> : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <h3 className="font-semibold text-heading">{s.name}</h3>
                      <p className="text-sm font-semibold text-emerald-700">{formatPrice(s.price, s.price_type)}</p>
                    </div>
                    {s.description ? <p className="mt-1 text-sm leading-relaxed text-ink/80">{s.description}</p> : null}
                    <p className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-muted">
                      {s.subcategory ? <span>{s.subcategory.name}</span> : null}
                      {s.availability ? <span>Availability: {s.availability}</span> : null}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">This business has not listed individual services yet. Send an enquiry to ask about what they offer.</p>
        )}
      </Card>

      {b.images.length ? (
        <Card className="p-6" id="photos">
          <h2 className="text-lg font-semibold">Photos</h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {b.images.map((img) => {
              const src = storageUrl(img.bucket, img.storage_path)!;
              return (
                <li key={img.id}>
                  <a href={src} target="_blank" rel="noopener" className="block overflow-hidden rounded-lg bg-canvas">
                    <Image src={src} alt={img.alt_text || `${b.name} photo`} width={img.width ?? 600} height={img.height ?? 450} sizes="(min-width: 1024px) 220px, 45vw" className="aspect-[4/3] w-full object-cover transition-transform hover:scale-[1.02]" />
                  </a>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

export function BusinessSidebar({ b }: { b: BusinessProfile }) {
  const lines = addressLines(b);
  const loc = b.location;
  const show = b.contact_publish_consent;
  const today = (new Date().getDay() + 6) % 7;
  const socials = [
    { href: b.facebook_url, label: "Facebook", Icon: FacebookIcon },
    { href: b.instagram_url, label: "Instagram", Icon: InstagramIcon },
    { href: b.tiktok_url, label: "TikTok", Icon: TiktokIcon },
    { href: b.linkedin_url, label: "LinkedIn", Icon: LinkedinIcon },
  ].filter((s) => s.href);
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-base font-semibold">Contact &amp; location</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {lines.length ? (
            <li className="flex gap-3"><MapPin className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden /><address className="not-italic">{lines.map((l) => <span key={l} className="block">{l}</span>)}</address></li>
          ) : null}
          {show && b.phone ? <li className="flex gap-3"><Phone className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden /><span>{formatPhone(b.phone)}</span></li> : null}
          {show && b.email ? <li className="flex gap-3"><Mail className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden /><span className="break-all">{b.email}</span></li> : null}
          {b.website ? <li className="flex gap-3"><Globe className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden /><span>{displayHost(b.website)}</span></li> : null}
        </ul>
        {loc?.service_areas?.length ? (
          <div className="mt-4 border-t border-line pt-4 text-sm">
            <p className="font-medium text-heading">Also serves</p>
            <p className="mt-1 text-muted">{loc.service_areas.join(", ")}</p>
          </div>
        ) : null}
        {socials.length ? (
          <div className="mt-4 flex gap-2 border-t border-line pt-4">
            {socials.map(({ href, label, Icon }) => (
              <ContactAnchor key={label} href={href!} target="_blank" rel="noopener nofollow" aria-label={`${b.name} on ${label}`} event={{ type: "contact", business_id: b.id, event: "social" }} className="grid size-9 place-items-center rounded-lg border border-line text-heading hover:bg-canvas">
                <Icon className="size-4" />
              </ContactAnchor>
            ))}
          </div>
        ) : null}
        {loc?.latitude != null && loc.longitude != null ? (
          <iframe
            title={`Map showing ${b.name}`}
            loading="lazy"
            className="mt-4 h-48 w-full rounded-lg border border-line"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${loc.longitude - 0.01}%2C${loc.latitude - 0.006}%2C${loc.longitude + 0.01}%2C${loc.latitude + 0.006}&layer=mapnik&marker=${loc.latitude}%2C${loc.longitude}`}
          />
        ) : null}
      </Card>

      {b.hours.length ? (
        <Card className="p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold"><Clock className="size-4 text-muted" aria-hidden /> Operating hours</h2>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {DAYS.map((d, i) => {
                const h = b.hours.find((x) => x.day_of_week === i);
                return (
                  <tr key={d} className={cn(i === today && "font-semibold text-heading")}>
                    <th scope="row" className="py-1.5 text-left font-normal">{d}{i === today ? " (today)" : ""}</th>
                    <td className="py-1.5 text-right tabular-nums">{!h ? <span className="text-muted">—</span> : h.is_closed ? "Closed" : `${fmtTime(h.opens_at)} – ${fmtTime(h.closes_at)}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ) : null}

      <p className="flex items-center gap-2 px-1 text-sm text-muted">
        <Flag className="size-4" aria-hidden />
        <Link href={`/report?business=${b.slug}`} className="hover:text-heading hover:underline">Report this listing</Link>
      </p>
    </div>
  );
}
