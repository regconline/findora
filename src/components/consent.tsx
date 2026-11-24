"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";

export type Consent = { analytics: boolean; ads: boolean; decided: boolean };
const COOKIE = "findora_consent";

export function readConsent(): Consent {
  if (typeof document === "undefined") return { analytics: false, ads: false, decided: false };
  const raw = document.cookie.split("; ").find((c) => c.startsWith(COOKIE + "="))?.split("=")[1];
  if (!raw) return { analytics: false, ads: false, decided: false };
  const v = decodeURIComponent(raw);
  return { analytics: v.includes("a1"), ads: v.includes("d1"), decided: true };
}

export function writeConsent(c: { analytics: boolean; ads: boolean }) {
  const value = `a${c.analytics ? 1 : 0}.d${c.ads ? 1 : 0}`;
  document.cookie = `${COOKIE}=${value}; Path=/; Max-Age=${60 * 60 * 24 * 180}; SameSite=Lax; Secure`;
  window.dispatchEvent(new CustomEvent("findora:consent"));
}

/** Opens the cookie preferences panel from anywhere (e.g. footer link). */
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new CustomEvent("findora:open-consent"))}>
      Cookie preferences
    </button>
  );
}

/**
 * POPIA-friendly consent: no analytics or personalised advertising cookies are
 * set until the visitor opts in. Essential cookies (login session) are always on.
 */
export function ConsentAndAnalytics({ gaId, adsenseClient }: { gaId: string; adsenseClient: string }) {
  const [consent, setConsent] = useState<Consent>({ analytics: false, ads: false, decided: true });
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [ads, setAds] = useState(false);

  useEffect(() => {
    const sync = () => {
      const c = readConsent();
      setConsent(c);
      setAnalytics(c.analytics);
      setAds(c.ads);
      if (!c.decided) setOpen(true);
    };
    const show = () => {
      setCustom(true);
      setOpen(true);
    };
    sync();
    window.addEventListener("findora:consent", sync);
    window.addEventListener("findora:open-consent", show);
    return () => {
      window.removeEventListener("findora:consent", sync);
      window.removeEventListener("findora:open-consent", show);
    };
  }, []);

  const save = (c: { analytics: boolean; ads: boolean }) => {
    writeConsent(c);
    setOpen(false);
    setCustom(false);
  };

  return (
    <>
      {gaId && consent.analytics ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}',{anonymize_ip:true});`}
          </Script>
        </>
      ) : null}
      {adsenseClient ? (
        <>
          <Script id="ads-consent" strategy="afterInteractive">
            {`(window.adsbygoogle=window.adsbygoogle||[]).requestNonPersonalizedAds=${consent.ads ? 0 : 1};`}
          </Script>
          <Script
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
            strategy="lazyOnload"
            crossOrigin="anonymous"
          />
        </>
      ) : null}

      {open ? (
        <div role="dialog" aria-modal="false" aria-labelledby="consent-title" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl border border-line bg-surface p-5 shadow-raised sm:inset-x-auto sm:right-5 sm:bottom-5">
          <h2 id="consent-title" className="text-base font-semibold">Your privacy choices</h2>
          <p className="mt-1.5 text-sm text-muted">
            We use essential cookies to keep you signed in. With your permission we also use analytics cookies to improve Findora
            {adsenseClient ? " and advertising cookies to show relevant ads" : ""}. See our{" "}
            <Link href="/cookies" className="text-emerald-700 underline">cookie policy</Link>.
          </p>
          {custom ? (
            <div className="mt-4 space-y-3 text-sm">
              <label className="flex items-start gap-3"><input type="checkbox" checked disabled className="mt-0.5 size-4 accent-emerald-600" /> <span><strong>Essential</strong> — sign-in and security. Always on.</span></label>
              <label className="flex items-start gap-3"><input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="mt-0.5 size-4 accent-emerald-600" /> <span><strong>Analytics</strong> — anonymised usage statistics (Google Analytics).</span></label>
              <label className="flex items-start gap-3"><input type="checkbox" checked={ads} onChange={(e) => setAds(e.target.checked)} className="mt-0.5 size-4 accent-emerald-600" /> <span><strong>Advertising</strong> — personalised ads. Without this, any ads shown are non-personalised.</span></label>
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => save({ analytics: true, ads: true })} className="h-9 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600">Accept all</button>
            <button type="button" onClick={() => save({ analytics: false, ads: false })} className="h-9 rounded-lg border border-line px-4 text-sm font-semibold text-heading hover:bg-canvas">Essential only</button>
            {custom ? (
              <button type="button" onClick={() => save({ analytics, ads })} className="h-9 rounded-lg border border-line px-4 text-sm font-semibold text-heading hover:bg-canvas">Save choices</button>
            ) : (
              <button type="button" onClick={() => setCustom(true)} className="h-9 px-2 text-sm font-medium text-emerald-700 hover:underline">Customise</button>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
