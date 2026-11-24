import Script from "next/script";
import { env } from "@/lib/env";

/** Cloudflare Turnstile widget — renders only when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set. */
export function Turnstile() {
  if (!env.turnstileSiteKey) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" />
      <div className="cf-turnstile" data-sitekey={env.turnstileSiteKey} data-theme="light" />
    </>
  );
}
