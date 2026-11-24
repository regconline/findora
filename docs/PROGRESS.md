# Findora — development progress report

_Last updated: 24 November 2026_

## Summary

The full MVP codebase is built: public site, search, business onboarding, dashboards, enquiries, admin, CMS, SEO and AdSense infrastructure. The database layer (schema, Row Level Security, triggers, search) is verified by an automated SQL test suite on a real PostgreSQL 16 server. The app typechecks, lints cleanly and produces a successful production build.

**Not yet done:** the end-to-end journey has **not** been run against a live Supabase project, because none was provisioned for this build. The Playwright test that covers it is written (`tests/e2e/critical-journey.spec.ts`) and must pass before declaring the MVP complete (acceptance criteria 24–25).

## Phase status

| Phase | Status |
| --- | --- |
| 1 Foundation — Next.js 16, TypeScript, Tailwind v4, Supabase schema + RLS, auth, design system, brand assets, navigation | ✅ Complete |
| 2 Business directory — 8-step onboarding wizard, profiles, categories, services, image uploads, approval workflow, public pages | ✅ Complete |
| 3 Customer functionality — profiles, search + filters + suggestions, saved businesses, enquiries, contact tracking | ✅ Complete |
| 4 Administration — moderation, users, categories, CMS, reports, messages, ads, analytics, audit log, settings | ✅ Complete |
| 5 SEO & content — metadata, canonical URLs, structured data, sitemap, robots, 12 original articles, legal/help pages, ad placements | ✅ Complete (legal placeholders need filling and review) |
| 6 Optimisation & testing — unit + DB security tests, lint, build, responsive checks | 🟡 Live E2E and Lighthouse on real data pending |
| 7 Deployment — Vercel config, env docs, guides, checklist | 🟡 Documented; not yet deployed |

## Acceptance criteria

| # | Criterion | Status |
| --- | --- | --- |
| 1 | Browse without an account | ✅ |
| 2 | Customers register and manage profiles | ✅ (built; live run pending) |
| 3–6 | Owners register, create businesses, upload photos, create multiple services | ✅ (built; uploads need live Storage test) |
| 7 | Admins approve businesses | ✅ (DB-tested) |
| 8 | Approved businesses get public URLs (`/businesses/name-city`) | ✅ |
| 9–10 | Search; filter by category and location | ✅ (DB-tested) |
| 11–13 | Contact businesses, submit enquiries, owners view enquiries | ✅ (DB-tested) |
| 14 | Save businesses | ✅ (DB-tested) |
| 15–17 | Admins manage users, categories, moderate reports | ✅ |
| 18 | Analytics from real recorded events | ✅ (no hardcoded statistics anywhere) |
| 19 | SEO-friendly public pages | ✅ |
| 20 | Responsive | ✅ Checked at 390 px and 1366 px with headless Chrome |
| 21 | Database security policies working | ✅ `npm run test:db` |
| 22 | AdSense present but disabled until approval | ✅ |
| 23 | Editorial CMS functional | ✅ (drafts, scheduling, publishing, images, categories, SEO fields) |
| 24 | No critical automated tests failing | 🟡 All tests run so far pass; E2E pending |
| 25 | Production deployment works | ⬜ Pending deployment |

## Test results (this build)

| Suite | Result |
| --- | --- |
| `npm test` (Vitest) | **34 / 34 passed** — auth, business, location, contact, hours, service, enquiry, report and ad validation; image processing (re-encoding, non-image rejection, format and size limits, EXIF stripping); URL/phone normalisation, open-redirect protection, pricing, pagination |
| `npm run test:db` (PostgreSQL 16 + Supabase shim) | **Passed** — all 7 migrations apply cleanly; ~45 assertions covering signup role assignment (admin cannot be self-assigned), owner self-approval/verification/featuring blocked, role escalation blocked, cross-account business/service/membership/storage writes denied, anonymous visibility limited to approved listings, search (prefix, service names, category, province, city, price, weekend filters, no-results), suggestions, enquiries (anonymous and customer, spoofed `customer_id` denied, customer and owner cannot rewrite messages, read/archive statuses), private enquiry isolation between accounts, statistics isolation, report status forced to `open`, suspended users lose access, rate limiter, scheduled blog posts hidden until due |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed (0 errors, 0 warnings) |
| `npm run build` | Passed — 70+ routes; public pages use ISR, private routes force dynamic rendering |
| `npm run test:e2e` | **Not run** — needs a test Supabase project (see below) |

## Outstanding tasks

1. **Provision Supabase + Vercel, then run the E2E journey** (`E2E_BASE_URL=… npm run test:e2e`) and fix anything it finds. This includes the first live test of Storage uploads, Supabase Auth emails and Resend.
2. **Legal:** replace `[placeholders]` in Privacy and Terms; legal review; register the Information Officer; publish a PAIA manual (`/paia-manual` route ready).
3. **Lighthouse / Core Web Vitals** on production with real listings (the architecture targets 90+: server components, ISR, self-hosted subset fonts, AVIF/WebP images, zero-JS charts, consent-gated third-party scripts).
4. **Data retention jobs** — e.g. a monthly `pg_cron` job to purge old analytics events and handled contact messages.
5. **Content Security Policy** — currently `frame-ancestors`, `base-uri`, `form-action` and `object-src` only. A full script-src CSP needs nonces for GA/AdSense/Turnstile.

### Designed-for but intentionally not built in the MVP (per spec)

- Payments / subscriptions (tables and fields exist: `subscriptions`, `plan`, `plan_status`, `plan_expires_at`, featured/sponsored flags with expiry).
- Real-time messaging (enquiries are the root record; a future `enquiry_messages` table can reference them).
- Distance search (latitude/longitude stored and indexed; add PostGIS `geography` + `ST_DWithin` later).
- Inviting additional managers to a business (`business_members` supports `owner`/`manager` roles; admins can add members today via SQL; UI not built).
- Reviews and ratings (deliberately excluded; never fabricated).

## Implementation notes

- **Service categories** reuse subcategories, so admins manage both from **Admin → Categories**.
- **Slugs** follow `business-name-city`, set when the location is first saved and frozen once published (admins can change them).
- **Edits to approved listings** go live immediately. Moderation continues via reports, hiding images, suspension and audit logs. Owners can resubmit or unpublish at any time.
- **Ranking:** organic results use full-text relevance (name > category/services > location > description), trigram name similarity and small completeness boosts (logo, substantial description). Featured listings appear only in a separately labelled block.
- **Analytics** are first-party, cookie-less, de-duplicated per visitor per day and exclude bots. GA4 is optional and consent-gated.
- **Email** degrades gracefully: without `RESEND_API_KEY`, messages are logged and all flows still complete. Contact-form messages are also stored in the database.

## Security review

| Area | Finding |
| --- | --- |
| Access control | RLS on all 28 tables; ownership via `business_members`; privileged columns protected by triggers; verified by tests |
| Admin | Role only from server-side `profiles.role`; `requireAdmin()` on every admin page and action; all sensitive actions written to `audit_logs`; suspended users are also banned at the auth layer |
| Service-role key | Server-only (`server-only` import guard). Used for: analytics inserts, rate limiting, notifications/email recipient lookup, consent and data-request logs, slug assignment, contact messages, account deletion, admin hard-delete storage cleanup, linking enquiries for unverified new accounts |
| Input handling | Zod validation on every form; parameterised queries via PostgREST/RPC (no SQL string building); `ilike` inputs sanitised; markdown rendered without raw HTML; JSON-LD escaped; URLs restricted to http(s); open-redirect protection on `next` |
| Abuse | Postgres-backed rate limits (login, register, enquiries, reports, contact, uploads, tracking); honeypots; optional Turnstile. Note: limiter **fails open** if the database is unreachable, to avoid locking out users |
| Uploads | Server-side decode and re-encode with sharp, format whitelist, 4 MB and pixel limits, EXIF/GPS stripped, random filenames, storage policies re-check ownership |
| Headers | HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, partial CSP |
| Note | Admins can technically read full enquiry content through the API (needed for abuse investigations). The admin UI deliberately shows metadata only; consider restricting further if not needed |

## External services requiring credentials

| Service | Variables | Required? |
| --- | --- | --- |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Yes |
| Resend | `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFICATION_EMAIL` | Yes for production |
| Vercel | — (project + domain) | Yes |
| Google Analytics 4 | `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Optional |
| Google Search Console | `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` or DNS | Recommended |
| Google AdSense | `NEXT_PUBLIC_ADSENSE_CLIENT_ID`, `NEXT_PUBLIC_ADSENSE_ENABLED` | After approval |
| Cloudflare Turnstile | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Recommended |

## Recommended next steps

1. Create a dedicated Supabase project for Findora (plus a separate test project, or use branching), apply migrations, configure Auth/SMTP/templates.
2. Import the repo into Vercel (Pro), set env vars, connect the domain.
3. Run the E2E journey on a preview deployment; fix any findings.
4. Complete the legal placeholders and get a legal review; register the Information Officer.
5. Seed real listings by onboarding a first cohort of local businesses (e.g. existing agency clients, with their consent) before applying for AdSense.
6. After 4–8 weeks of real traffic, review Admin → Analytics "Searches with no results" to guide category and business recruitment.
