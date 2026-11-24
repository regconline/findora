# Supabase setup

## 1. Create the project

1. Create a project at [supabase.com](https://supabase.com). Choose a region close to South African users (EU regions such as `eu-west-2`/`eu-central-1` are commonly used; check whether an African region is available to you).
2. Copy from **Project Settings → API**: the Project URL, the anon/publishable key and the service-role/secret key, into `.env.local` (and later into Vercel).

## 2. Apply the database migrations

Using the Supabase CLI:

```bash
npx supabase login
npx supabase link --project-ref YOUR-REF
npx supabase db push
```

Or paste each file from `supabase/migrations/` into the SQL editor **in filename order**.

| Migration | Contents |
| --- | --- |
| `…01_schema.sql` | All tables (profiles, businesses, business_members, categories, subcategories, services, business_images, business_hours, business_locations, customer_enquiries, saved_businesses, business_reports, business_views, contact_events, blog_posts, blog_categories, faqs, site_pages, advertisements, subscriptions, notifications, audit_logs, platform_settings + consent_records, data_requests, rate_limits, platform_events), indexes, constraints |
| `…02_functions.sql` | Signup trigger, column-protection triggers, search vector maintenance, `search_businesses`, suggestions, rate limiter, statistics functions |
| `…03_rls.sql` | Row Level Security policies on every table |
| `…04_storage.sql` | Storage buckets and storage policies |
| `…05_seed_categories.sql` | 20 categories and their subcategories |
| `…06_contact_messages.sql` | Contact form inbox |
| `…07_seed_content.sql` | 12 articles, site/legal pages, FAQs, default platform settings |

Seed migrations use `ON CONFLICT DO NOTHING`, so re-running never overwrites admin edits.

Verify the database logic locally at any time with `npm run test:db` (needs PostgreSQL 15/16 binaries).

## 3. Authentication settings

**Authentication → URL Configuration**

- Site URL: `https://findora.co.za` (your production URL)
- Redirect URLs: `https://findora.co.za/**`, `http://localhost:3000/**` and your Vercel preview URL pattern, e.g. `https://*-yourteam.vercel.app/**`

**Authentication → Providers → Email**

- Enable email provider, **Confirm email: ON**, Secure email change: ON.
- Minimum password length: 10 (the app also enforces letters + numbers).

**Authentication → Email Templates** — paste the branded templates from `supabase/templates/`:

| Template | File | Subject |
| --- | --- | --- |
| Confirm signup | `confirm-signup.html` | Confirm your Findora account |
| Reset password | `reset-password.html` | Reset your Findora password |

These use the `token_hash` flow handled by `/auth/confirm`.

**Authentication → SMTP** — configure Resend SMTP so auth emails come from your domain (see [EMAIL_SETUP.md](EMAIL_SETUP.md)). Supabase's built-in sender is heavily rate-limited and not for production.

**Rate limits / bot protection** — optionally enable CAPTCHA (Turnstile) in Supabase Auth too.

## 4. Storage

The storage migration creates these public-read buckets (5 MB limit, JPG/PNG/WebP only):

| Bucket | Path | Who can write |
| --- | --- | --- |
| `business-logos` | `{business_id}/{file}.webp` | Owners/managers of that business, admins |
| `business-covers` | `{business_id}/{file}.webp` | Owners/managers, admins |
| `business-gallery` | `{business_id}/{file}.webp` (gallery + service images) | Owners/managers, admins |
| `avatars` | `{user_id}/{file}.webp` | That user |
| `site-media` | `articles/{file}.webp` | Admins |

Uploads always pass through the Next.js server, which decodes the image, rejects non-images, strips EXIF/GPS metadata, resizes and re-encodes to WebP before uploading with the user's own session (so storage policies are enforced a second time). If `storage.buckets` inserts fail in your project, create the buckets in the dashboard with the same names and settings, then re-run the policy statements.

## 5. Create the first administrator

Register normally on the site, verify the email, then in the SQL editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

Admin privileges can only be granted this way or by another admin in **Admin → Users**. Users can never assign roles to themselves (enforced by a database trigger and tested).

## 6. Backups

- Supabase Pro includes daily backups; enable **Point-in-Time Recovery** for finer recovery if your budget allows.
- On the free plan, schedule your own logical backups, e.g. a weekly `supabase db dump -f backup.sql` (and `--data-only`) stored securely off-platform.
- Storage objects are not included in database backups — periodically copy buckets if photos are business-critical.

## 7. Monitoring

Check **Advisors → Security / Performance** after deployment and after schema changes, and review **Logs** for auth and API errors.
