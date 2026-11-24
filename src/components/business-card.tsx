import Image from "next/image";
import { BadgeCheck, MapPin, Tag } from "lucide-react";
import { Badge } from "@/components/ui";
import { cn, formatPrice, storageUrl, truncate } from "@/lib/utils";
import { BUCKETS } from "@/lib/constants";
import type { SearchResult } from "@/lib/types";
import { TrackedLink } from "@/components/track";

export function BusinessLogo({ path, name, size = 56, className }: { path: string | null; name: string; size?: number; className?: string }) {
  const src = storageUrl(BUCKETS.logos, path);
  const letters = name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  return src ? (
    <Image src={src} alt={`${name} logo`} width={size} height={size} sizes={`${size}px`} className={cn("shrink-0 rounded-xl border border-line bg-surface object-contain", className)} style={{ width: size, height: size }} />
  ) : (
    <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-xl bg-navy-900 font-semibold text-white", className)} style={{ width: size, height: size, fontSize: size / 3 }}>
      {letters}
    </span>
  );
}

export function BusinessCard({ b, label, trackSearch }: { b: SearchResult; label?: "featured" | "sponsored"; trackSearch?: boolean }) {
  const location = [b.suburb, b.city, b.province].filter(Boolean).join(", ");
  return (
    <article className="lift group relative flex h-full flex-col rounded-card border border-line bg-surface p-5 shadow-card">
      <div className="flex items-start gap-4">
        <BusinessLogo path={b.logo_path} name={b.name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {label === "featured" ? <Badge tone="sponsored">Featured</Badge> : null}
            {label === "sponsored" ? <Badge tone="sponsored">Sponsored</Badge> : null}
            {b.category_name ? <span className="text-xs font-medium text-emerald-700">{b.subcategory_name ?? b.category_name}</span> : null}
          </div>
          <h3 className="mt-0.5 text-base font-semibold leading-snug text-heading">
            <TrackedLink
              href={`/businesses/${b.slug}`}
              event={trackSearch ? { type: "platform", event: "search_click", ref_id: b.id } : undefined}
              className="after:absolute after:inset-0 after:rounded-card focus-visible:outline-none"
            >
              {b.name}
            </TrackedLink>
            {b.is_verified ? (
              <BadgeCheck className="ml-1 inline size-4 align-[-2px] text-emerald-600" aria-label="Verified business" />
            ) : null}
          </h3>
          {location ? (
            <p className="mt-1 flex items-center gap-1 text-sm text-muted">
              <MapPin className="size-3.5 shrink-0" aria-hidden /> <span className="truncate">{location}</span>
            </p>
          ) : null}
        </div>
      </div>
      <p className="mt-4 line-clamp-3 flex-1 text-sm leading-relaxed text-ink/80">{truncate(b.tagline || b.description || "", 180)}</p>
      {b.service_count > 0 ? (
        <p className="mt-4 flex items-center gap-1.5 border-t border-line pt-3 text-[13px] text-muted">
          <Tag className="size-3.5" aria-hidden />
          {b.service_count} service{b.service_count === 1 ? "" : "s"}
          {b.min_price != null ? <span className="text-ink"> · {formatPrice(b.min_price, "starting_from")}</span> : null}
        </p>
      ) : null}
    </article>
  );
}

export function BusinessGrid({ items, trackSearch }: { items: SearchResult[]; trackSearch?: boolean }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((b) => (
        <li key={b.id}><BusinessCard b={b} trackSearch={trackSearch} /></li>
      ))}
    </ul>
  );
}
