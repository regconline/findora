# Findora

**Discover Businesses. Connect with Confidence.**

Findora is a South African business discovery platform. Customers search and contact businesses for free. Businesses create free listings with their services, photos, hours and contact details, receive enquiries and see real analytics. Administrators moderate listings and manage content from a separate admin panel.

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Components, Server Actions), React 19, TypeScript |
| Styling | Tailwind CSS v4, a shadcn/ui-style component kit (`src/components/ui.tsx`, `form.tsx`), Lucide icons |
| Database | Supabase PostgreSQL with Row Level Security, full-text and trigram search |
| Auth | Supabase Auth (email + password, email verification, password reset) |
| Storage | Supabase Storage (separate buckets for logos, covers, galleries, avatars, site media); server-side image processing with `sharp` |
| Email | Resend |
| Hosting | Vercel |
| Optional | Google Analytics 4, Google AdSense, Cloudflare Turnstile, OpenStreetMap embeds, WhatsApp click-to-chat |

## Quick start (local development)

```bash
npm install
cp .env.example .env.local      # fill in your Supabase keys (see docs/SUPABASE_SETUP.md)
npx supabase link --project-ref YOUR-REF
npx supabase db push            # applies supabase/migrations (schema, RLS, storage, seed content)
npm run dev                     # http://localhost:3000
```

Make yourself an administrator after registering (run in the Supabase SQL editor):

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest): validation, permissions-relevant helpers, image processing, utilities |
| `npm run test:db` | Spins up a throwaway PostgreSQL 16, applies every migration and runs the RLS/security + search + workflow suite (`supabase/tests`) |
| `npm run test:e2e` | Playwright critical-journey test against a running instance connected to a **test** Supabase project |
| `npm run content:generate` | Rebuilds the content seed migration from `/content` |

## Project structure

```
src/
  app/
    (public)/        homepage, search, categories, business profiles, blog, CMS pages, contact, report
    (auth)/          login, registration (customer + business wizard step 1), password reset, verification
    auth/confirm/    email link handler (verification, recovery)
    dashboard/       customer + business-owner dashboard, onboarding wizard, enquiries, analytics, settings
    admin/           moderation, users, categories, CMS, reports, ads, analytics, audit log, settings
    api/             track (first-party analytics), suggest (search suggestions), account/export (POPIA)
    sitemap.ts, robots.ts, ads.txt/
  components/        UI kit, forms, business profile, search, charts, consent, ads
  lib/               supabase clients, auth guards, validation (zod), data access, email, images, security
  proxy.ts           session refresh + route protection (Next 16 "proxy", formerly middleware)
supabase/
  migrations/        schema, functions, RLS, storage, seeds (categories, content)
  tests/             SQL security suite + plain-Postgres Supabase shim
  templates/         branded Supabase Auth email templates
content/             source markdown for the 12 seed articles and site pages
docs/                setup, deployment, email, POPIA checklist, progress report
```

## Documentation

- [Supabase setup](docs/SUPABASE_SETUP.md) — database, auth, storage, email templates, admin accounts
- [Email setup](docs/EMAIL_SETUP.md) — Resend and Supabase SMTP
- [Deployment](docs/DEPLOYMENT.md) — Vercel, domain, Search Console, AdSense, backups, monitoring, checklist, costs
- [POPIA / PAIA compliance checklist](docs/POPIA_COMPLIANCE.md)
- [Progress report](docs/PROGRESS.md) — completed features, outstanding work, test results, security notes

## Security model in one paragraph

Every table has Row Level Security. Anonymous visitors can only read approved, non-deleted listings and published content. Owners can manage only businesses they are members of (`business_members`), and database triggers stop them changing moderation, verification, monetisation or role fields — including their own `profiles.role`. Admin rights come only from the server-side `role` column. The service-role key is used only in server code, for narrowly scoped operations after validation (analytics inserts, notifications, account deletion). All of this is covered by `npm run test:db`.
