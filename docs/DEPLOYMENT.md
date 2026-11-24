# Deployment guide (Vercel)

## 1. Prerequisites

- Supabase project configured per [SUPABASE_SETUP.md](SUPABASE_SETUP.md)
- Resend domain verified per [EMAIL_SETUP.md](EMAIL_SETUP.md)
- The code pushed to a GitHub repository (e.g. `regconline/findora`)
- A domain, e.g. `findora.co.za`

## 2. Create the Vercel project

1. In Vercel → **Add New → Project**, import the GitHub repository. Framework preset: **Next.js** (auto-detected). No build-setting changes are needed.
2. Add environment variables from `.env.example` for **Production** (and Preview with a separate *test* Supabase project if you can):
   - `NEXT_PUBLIC_SITE_URL=https://findora.co.za`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (**not** prefixed with `NEXT_PUBLIC_`)
   - `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFICATION_EMAIL`
   - `ANALYTICS_SALT` (long random string — `openssl rand -hex 32`)
   - Optional: GA4, Search Console token, Turnstile keys, AdSense (keep `NEXT_PUBLIC_ADSENSE_ENABLED=false`)
3. Deploy. Region: choose one close to your Supabase region to minimise latency.

> **Plan note:** Vercel's Hobby plan is for personal, non-commercial use only. Findora is a commercial product, so use the **Pro** plan for production.

## 3. Domain and SSL

1. Vercel → Project → **Settings → Domains** → add `findora.co.za` and `www.findora.co.za`.
2. At your DNS provider (e.g. your .co.za registrar), add the records Vercel shows (A record for the apex, CNAME for `www`). Redirect `www` → apex (or the reverse) in Vercel.
3. Vercel issues and renews SSL certificates automatically. HSTS is already sent by the app.
4. Update **Supabase → Authentication → URL Configuration** with the final domain, and `NEXT_PUBLIC_SITE_URL` in Vercel; redeploy.

## 4. Google Search Console

1. Add a **Domain property** for `findora.co.za` and verify with the DNS TXT record (recommended), or set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` for HTML-tag verification.
2. Submit `https://findora.co.za/sitemap.xml`.
3. `robots.txt` blocks dashboards, admin, auth pages and APIs; preview deployments are fully disallowed automatically.

## 5. Google Analytics 4

Create a GA4 web data stream and set `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXX`. The script loads only after a visitor accepts analytics cookies. First-party Findora analytics (business statistics) work regardless.

## 6. Google AdSense (after launch, once you have content and traffic)

Advertising is built in but **switched off by default**. Approval is never guaranteed — AdSense evaluates content quality, originality and policy compliance.

1. Apply at AdSense with your domain. Add the site, then verify ownership: set `NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX` and `NEXT_PUBLIC_ADSENSE_ENABLED=true`, redeploy (the AdSense script loads site-wide; ads still show nowhere until step 3).
2. `https://findora.co.za/ads.txt` is generated automatically from the client ID. Confirm AdSense shows it as "Authorised".
3. After approval, create responsive display ad units in AdSense. In **Admin → Advertising**, add a placement per location with its numeric slot ID and mark it active. Then switch on **Admin → Platform settings → Show advertisements**.
4. Ads appear only in: homepage (between sections), search results (after 6 organic listings), category pages, blog articles (mid-article) and business profiles (below business information) — always labelled "Advertisement", never on login, registration, dashboards or enquiry forms. Personalised ads require cookie consent; otherwise non-personalised ads are requested.

## 7. Backups

See SUPABASE_SETUP.md §6. Minimum: Supabase Pro daily backups + a monthly off-platform `pg_dump` + periodic copy of storage buckets. Test a restore at least once.

## 8. Monitoring

- **Vercel:** Observability / runtime logs, and optionally Speed Insights for Core Web Vitals.
- **Supabase:** Advisors (security + performance), auth and API logs, usage alerts.
- **Uptime:** any external uptime monitor pinging `/` and `/businesses` every few minutes.
- **Email:** Resend dashboard for bounces/complaints.
- Review **Admin → Audit log**, **Reports** and **Contact messages** regularly.

## 9. Deployment checklist

- [ ] All migrations applied; `npm run test:db` passes locally
- [ ] Supabase Auth: confirm email ON, site URL and redirect URLs set, branded templates pasted, custom SMTP (Resend) configured
- [ ] Storage buckets exist with policies
- [ ] Vercel environment variables set (service-role key is server-only)
- [ ] `ANALYTICS_SALT` set to a random value
- [ ] Domain connected, SSL active, `NEXT_PUBLIC_SITE_URL` correct
- [ ] First admin account promoted via SQL
- [ ] **Legal pages: replace every `[placeholder]` in Privacy, Terms (operating entity, registration number, Information Officer, addresses) — then have them reviewed by a legal professional**
- [ ] Information Officer registered with the Information Regulator; PAIA manual prepared (see POPIA_COMPLIANCE.md)
- [ ] Platform settings: contact + privacy emails, social links
- [ ] Test the full journey on production: register → verify → create listing → approve → search → enquiry → emails received
- [ ] Search Console verified, sitemap submitted
- [ ] GA4 configured (optional); AdSense left disabled until approval
- [ ] Backups and uptime monitoring in place
- [ ] Run Lighthouse on `/`, `/businesses`, a business profile and a blog article

## 10. Estimated monthly operating costs (USD, excl. VAT)

Approximate, based on published pricing checked November 2026 — confirm on each provider's pricing page.

| Service | Launch (low traffic) | Notes |
| --- | --- | --- |
| Vercel Pro | $20 | One seat; includes $20 usage credit. Hobby is not permitted for commercial use. |
| Supabase | $0 (Free) → $25 (Pro) | Free projects pause after a period of inactivity and have no backups — use Pro for production. Pro includes daily backups and 100K MAU. |
| Resend | $0 (3,000 emails/month, 100/day) → $20 (50,000/month) | Upgrade when daily volume exceeds 100 emails. |
| Domain (.co.za) | ≈ R10–R15 / month equivalent | Billed annually by registrar. |
| Cloudflare Turnstile, GA4, Search Console, OpenStreetMap | $0 | |
| **Total** | **≈ $45–$65 / month** (≈ R850–R1,250) at launch | Grows mainly with storage (photos), bandwidth and email volume. |

Sources: [Supabase pricing](https://supabase.com/pricing), [Vercel pricing](https://vercel.com/pricing), [Resend pricing](https://resend.com/pricing).
