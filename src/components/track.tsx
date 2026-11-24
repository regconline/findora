"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

export type TrackEvent =
  | { type: "view"; business_id: string; service_id?: string }
  | { type: "contact"; business_id: string; event: "phone" | "whatsapp" | "email" | "website" | "directions" | "social" }
  | { type: "platform"; event: "home_view" | "category_view" | "search" | "search_click"; ref_id?: string; query?: string; result_count?: number };

/** Fire-and-forget beacon to the first-party analytics endpoint (no cookies, no PII). */
export function track(e: TrackEvent) {
  try {
    const body = JSON.stringify(e);
    if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    else fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } });
  } catch {
    /* analytics must never break the page */
  }
  const w = window as unknown as { gtag?: (...a: unknown[]) => void };
  if (w.gtag) {
    if (e.type === "contact") w.gtag("event", `contact_${e.event}`);
    if (e.type === "platform" && e.event === "search") w.gtag("event", "search", { search_term: e.query });
  }
}

/** Records an event once when mounted (page views, searches). */
export function TrackOnMount({ event }: { event: TrackEvent }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track(event);
  }, [event]);
  return null;
}

export function TrackedLink({
  event, href, children, ...rest
}: React.ComponentProps<typeof Link> & { event?: TrackEvent }) {
  return (
    <Link href={href} onClick={() => event && track(event)} {...rest}>
      {children}
    </Link>
  );
}

/** External contact action (tel:, wa.me, mailto:, website) with click tracking. */
export function ContactAnchor({
  event, children, ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { event: TrackEvent }) {
  return (
    <a {...rest} onClick={() => track(event)}>
      {children}
    </a>
  );
}
