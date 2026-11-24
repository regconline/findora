import { env } from "@/lib/env";
import { getActiveAd, getSettings } from "@/lib/data";
import { GoogleAdUnit } from "@/components/google-ad";

type Placement = "home_mid" | "search_results" | "category_page" | "blog_article" | "business_profile";

/**
 * Central advertisement component. Renders nothing unless:
 *  - NEXT_PUBLIC_ADSENSE_ENABLED=true and a publisher ID is set (for AdSense), and
 *  - the admin has enabled ads in platform settings, and
 *  - an active advertisement is configured for this placement.
 * Never use on login/registration pages, dashboards, enquiry forms or private messages.
 */
export async function AdSlot({ placement, className }: { placement: Placement; className?: string }) {
  const [settings, ad] = await Promise.all([getSettings(), getActiveAd(placement)]);
  if (!settings.ads_enabled || !ad) return null;

  if (ad.provider === "adsense") {
    if (!env.adsenseEnabled || !env.adsenseClientId || !ad.adsense_slot) return null;
    return (
      <GoogleAdUnit client={env.adsenseClientId} slot={ad.adsense_slot} className={className} />
    );
  }

  if (!ad.image_url || !ad.link_url) return null;
  return (
    <aside aria-label="Advertisement" className={className}>
      <p className="mb-1 text-center text-[11px] font-medium uppercase tracking-widest text-muted">Advertisement</p>
      <a href={ad.link_url} rel="sponsored noopener" target="_blank" className="block overflow-hidden rounded-card border border-line bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ad.image_url} alt={ad.alt_text || ad.name} loading="lazy" className="mx-auto h-auto max-h-[250px] w-full object-contain" />
      </a>
    </aside>
  );
}
