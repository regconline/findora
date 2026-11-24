"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Responsive AdSense unit. Reserves space to avoid layout shift and collapses
 * the container if no ad is filled (data-ad-status="unfilled").
 */
export function GoogleAdUnit({ client, slot, className }: { client: string; slot: string; className?: string }) {
  const ref = useRef<HTMLModElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    try {
      ((window as unknown as { adsbygoogle: unknown[] }).adsbygoogle ||= []).push({});
    } catch {
      queueMicrotask(() => setHidden(true));
    }
    const obs = new MutationObserver(() => {
      if (el.getAttribute("data-ad-status") === "unfilled") setHidden(true);
    });
    obs.observe(el, { attributes: true, attributeFilter: ["data-ad-status"] });
    return () => obs.disconnect();
  }, []);

  if (hidden) return null;
  return (
    <aside aria-label="Advertisement" className={className}>
    <p className="mb-1 text-center text-[11px] font-medium uppercase tracking-widest text-muted">Advertisement</p>
    <div className="min-h-[100px] overflow-hidden rounded-card border border-dashed border-line bg-surface/60 sm:min-h-[120px]">
      <ins
        ref={ref}
        className="adsbygoogle block"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
    </aside>
  );
}
