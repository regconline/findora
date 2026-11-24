-- =====================================================================
-- FINDORA — core schema
-- Supabase PostgreSQL. Run with `supabase db push` or paste into the SQL editor.
-- =====================================================================

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------------
-- Enumerated types
-- ---------------------------------------------------------------------
create type public.user_role as enum ('customer', 'business_owner', 'admin');
create type public.account_status as enum ('active', 'suspended', 'deleted');
create type public.business_status as enum ('draft', 'pending', 'approved', 'rejected', 'suspended');
create type public.business_type as enum ('sole_proprietor', 'private_company', 'partnership', 'non_profit', 'freelancer', 'franchise', 'other');
create type public.price_type as enum ('fixed', 'starting_from', 'hourly', 'quote', 'free');
create type public.member_role as enum ('owner', 'manager');
create type public.image_kind as enum ('gallery', 'service');
create type public.enquiry_status as enum ('new', 'read', 'archived');
create type public.report_reason as enum ('suspicious', 'incorrect_information', 'inappropriate_photo', 'spam', 'other');
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
create type public.contact_event_type as enum ('phone', 'whatsapp', 'email', 'website', 'directions', 'social');
create type public.view_type as enum ('profile', 'service');
create type public.post_status as enum ('draft', 'scheduled', 'published', 'archived');
create type public.subscription_plan as enum ('free', 'premium', 'sponsored');
create type public.subscription_status as enum ('active', 'trialing', 'past_due', 'cancelled', 'expired');
create type public.ad_placement as enum ('home_mid', 'search_results', 'category_page', 'blog_article', 'business_profile');
create type public.ad_provider as enum ('adsense', 'direct');

-- ---------------------------------------------------------------------
-- Utility: updated_at trigger
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 1. profiles
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  email text,
  phone text check (phone is null or char_length(phone) <= 30),
  avatar_path text,
  bio text check (bio is null or char_length(bio) <= 500),
  city text,
  province text,
  role public.user_role not null default 'customer',
  status public.account_status not null default 'active',
  profile_is_public boolean not null default false,
  marketing_opt_in boolean not null default false,
  terms_accepted_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index profiles_role_idx on public.profiles (role);
create index profiles_status_idx on public.profiles (status);
create index profiles_email_trgm on public.profiles using gin (email extensions.gin_trgm_ops);
create index profiles_name_trgm on public.profiles using gin (full_name extensions.gin_trgm_ops);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 4/5. categories & subcategories
-- ---------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 80),
  description text,
  icon text not null default 'briefcase',
  sort_order int not null default 0,
  is_active boolean not null default true,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index categories_active_sort_idx on public.categories (is_active, sort_order);
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

create table public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 80),
  description text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, slug)
);
create index subcategories_category_idx on public.subcategories (category_id, is_active, sort_order);
create index subcategories_slug_idx on public.subcategories (slug);
create trigger subcategories_updated_at before update on public.subcategories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 2. businesses
-- ---------------------------------------------------------------------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 120),
  tagline text check (tagline is null or char_length(tagline) <= 160),
  description text not null default '' check (char_length(description) <= 5000),
  business_type public.business_type not null default 'other',
  category_id uuid references public.categories (id) on delete set null,
  subcategory_id uuid references public.subcategories (id) on delete set null,
  year_established int check (year_established is null or year_established between 1800 and 2100),
  registration_number text check (registration_number is null or char_length(registration_number) <= 40),
  show_registration_number boolean not null default false,
  -- contact (published only with consent)
  phone text,
  whatsapp text,
  email text,
  website text,
  facebook_url text,
  instagram_url text,
  tiktok_url text,
  linkedin_url text,
  contact_publish_consent boolean not null default false,
  -- branding (storage paths)
  logo_path text,
  cover_path text,
  -- moderation
  status public.business_status not null default 'draft',
  rejection_reason text,
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.profiles (id) on delete set null,
  suspended_reason text,
  -- verification (only set by admins after a real verification process)
  is_verified boolean not null default false,
  verified_at timestamptz,
  verification_notes text,
  -- monetisation (inactive in MVP, admin-controlled)
  plan public.subscription_plan not null default 'free',
  plan_status public.subscription_status not null default 'active',
  plan_expires_at timestamptz,
  is_featured boolean not null default false,
  featured_until timestamptz,
  is_sponsored boolean not null default false,
  sponsored_until timestamptz,
  -- search
  search_vector tsvector,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index businesses_status_idx on public.businesses (status) where deleted_at is null;
create index businesses_category_idx on public.businesses (category_id, status);
create index businesses_subcategory_idx on public.businesses (subcategory_id, status);
create index businesses_approved_recent_idx on public.businesses (approved_at desc) where status = 'approved' and deleted_at is null;
create index businesses_search_idx on public.businesses using gin (search_vector);
create index businesses_name_trgm on public.businesses using gin (name extensions.gin_trgm_ops);
create index businesses_type_idx on public.businesses (business_type);
create index businesses_featured_idx on public.businesses (is_featured, featured_until) where is_featured;
create trigger businesses_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 3. business_members (one user ↔ many businesses, many users ↔ one business)
-- ---------------------------------------------------------------------
create table public.business_members (
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);
create index business_members_user_idx on public.business_members (user_id);

-- ---------------------------------------------------------------------
-- 9. business_locations
-- ---------------------------------------------------------------------
create table public.business_locations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  is_primary boolean not null default true,
  province text not null,
  city text not null,
  town text,
  suburb text,
  street_address text,
  show_street_address boolean not null default true,
  postal_code text check (postal_code is null or postal_code ~ '^[0-9]{4}$'),
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  service_areas text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index business_locations_primary_uniq on public.business_locations (business_id) where is_primary;
create index business_locations_province_city_idx on public.business_locations (lower(province), lower(city));
create index business_locations_city_trgm on public.business_locations using gin (city extensions.gin_trgm_ops);
-- ready for future distance search (swap for PostGIS geography index when enabled)
create index business_locations_latlng_idx on public.business_locations (latitude, longitude) where latitude is not null;
create trigger business_locations_updated_at before update on public.business_locations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 8. business_hours
-- ---------------------------------------------------------------------
create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = Monday
  is_closed boolean not null default false,
  opens_at time,
  closes_at time,
  note text,
  unique (business_id, day_of_week),
  check (is_closed or (opens_at is not null and closes_at is not null))
);

-- ---------------------------------------------------------------------
-- 6. services
-- ---------------------------------------------------------------------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  subcategory_id uuid references public.subcategories (id) on delete set null,
  name text not null check (char_length(name) between 2 and 120),
  description text check (description is null or char_length(description) <= 2000),
  price numeric(12, 2) check (price is null or price >= 0),
  price_type public.price_type not null default 'quote',
  availability text check (availability is null or char_length(availability) <= 200),
  image_path text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index services_business_idx on public.services (business_id, sort_order);
create index services_subcategory_idx on public.services (subcategory_id);
create index services_name_trgm on public.services using gin (name extensions.gin_trgm_ops);
create index services_price_idx on public.services (price) where price is not null;
create trigger services_updated_at before update on public.services
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 7. business_images (gallery + service images; logo/cover live on businesses)
-- ---------------------------------------------------------------------
create table public.business_images (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  kind public.image_kind not null default 'gallery',
  bucket text not null default 'business-gallery',
  storage_path text not null unique,
  alt_text text not null default '' check (char_length(alt_text) <= 200),
  width int,
  height int,
  sort_order int not null default 0,
  is_hidden boolean not null default false, -- admin moderation
  created_at timestamptz not null default now()
);
create index business_images_business_idx on public.business_images (business_id, kind, sort_order);

-- ---------------------------------------------------------------------
-- 10. customer_enquiries (root record; a future `enquiry_messages` table can reference it for threaded messaging)
-- ---------------------------------------------------------------------
create table public.customer_enquiries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid references public.profiles (id) on delete set null,
  service_id uuid references public.services (id) on delete set null,
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) <= 254),
  phone text check (phone is null or char_length(phone) <= 30),
  subject text not null check (char_length(subject) between 2 and 150),
  message text not null check (char_length(message) between 10 and 4000),
  status public.enquiry_status not null default 'new',
  read_at timestamptz,
  customer_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index enquiries_business_idx on public.customer_enquiries (business_id, status, created_at desc);
create index enquiries_customer_idx on public.customer_enquiries (customer_id, created_at desc);
create trigger enquiries_updated_at before update on public.customer_enquiries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 11. saved_businesses
-- ---------------------------------------------------------------------
create table public.saved_businesses (
  user_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, business_id)
);
create index saved_businesses_business_idx on public.saved_businesses (business_id);

-- ---------------------------------------------------------------------
-- 12. business_reports
-- ---------------------------------------------------------------------
create table public.business_reports (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  image_id uuid references public.business_images (id) on delete set null,
  reporter_id uuid references public.profiles (id) on delete set null,
  reporter_email text,
  reason public.report_reason not null,
  details text not null check (char_length(details) between 10 and 2000),
  status public.report_status not null default 'open',
  admin_notes text,
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index business_reports_status_idx on public.business_reports (status, created_at desc);
create index business_reports_business_idx on public.business_reports (business_id);
create trigger business_reports_updated_at before update on public.business_reports
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 13/14. analytics (no raw IPs; visitor_hash is a salted daily hash)
-- ---------------------------------------------------------------------
create table public.business_views (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  view_type public.view_type not null default 'profile',
  visitor_hash text not null,
  viewed_on date not null default (now() at time zone 'Africa/Johannesburg')::date,
  created_at timestamptz not null default now()
);
-- one counted view per visitor per business/service per day
create unique index business_views_dedupe on public.business_views (business_id, view_type, coalesce(service_id, '00000000-0000-0000-0000-000000000000'::uuid), visitor_hash, viewed_on);
create index business_views_business_date_idx on public.business_views (business_id, viewed_on);

create table public.contact_events (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses (id) on delete cascade,
  event_type public.contact_event_type not null,
  visitor_hash text,
  occurred_on date not null default (now() at time zone 'Africa/Johannesburg')::date,
  created_at timestamptz not null default now()
);
create index contact_events_business_date_idx on public.contact_events (business_id, occurred_on, event_type);

-- platform-level events (homepage visits, category views, searches, result clicks, registrations)
create table public.platform_events (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in ('home_view', 'category_view', 'search', 'search_click', 'registration', 'business_submitted')),
  ref_id uuid,
  query text check (query is null or char_length(query) <= 200),
  result_count int,
  occurred_on date not null default (now() at time zone 'Africa/Johannesburg')::date,
  created_at timestamptz not null default now()
);
create index platform_events_type_date_idx on public.platform_events (event_type, occurred_on);

-- ---------------------------------------------------------------------
-- 15/16. blog
-- ---------------------------------------------------------------------
create table public.blog_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger blog_categories_updated_at before update on public.blog_categories
  for each row execute function public.set_updated_at();

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 5 and 160),
  excerpt text not null default '' check (char_length(excerpt) <= 320),
  content text not null default '',
  cover_image_url text,
  cover_image_alt text,
  category_id uuid references public.blog_categories (id) on delete set null,
  author_id uuid references public.profiles (id) on delete set null,
  author_name text not null default 'Findora Editorial Team',
  status public.post_status not null default 'draft',
  published_at timestamptz,
  seo_title text,
  seo_description text,
  reading_minutes int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index blog_posts_public_idx on public.blog_posts (status, published_at desc);
create index blog_posts_category_idx on public.blog_posts (category_id);
create trigger blog_posts_updated_at before update on public.blog_posts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 17. faqs
-- ---------------------------------------------------------------------
create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null check (char_length(question) between 5 and 300),
  answer text not null check (char_length(answer) between 5 and 4000),
  audience text not null default 'general' check (audience in ('general', 'customers', 'businesses')),
  sort_order int not null default 0,
  is_published boolean not null default true,
  show_on_home boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index faqs_public_idx on public.faqs (is_published, audience, sort_order);
create trigger faqs_updated_at before update on public.faqs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 18. site_pages (About, legal pages, help content…)
-- ---------------------------------------------------------------------
create table public.site_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  summary text,
  content text not null default '',
  seo_title text,
  seo_description text,
  is_published boolean not null default true,
  show_in_footer boolean not null default false,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger site_pages_updated_at before update on public.site_pages
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 19. advertisements (AdSense slots or direct campaigns per placement)
-- ---------------------------------------------------------------------
create table public.advertisements (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  placement public.ad_placement not null,
  provider public.ad_provider not null default 'adsense',
  adsense_slot text check (adsense_slot is null or adsense_slot ~ '^[0-9]{6,20}$'),
  image_url text,
  link_url text,
  alt_text text,
  business_id uuid references public.businesses (id) on delete set null,
  is_active boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index advertisements_placement_idx on public.advertisements (placement, is_active);
create trigger advertisements_updated_at before update on public.advertisements
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 20. subscriptions (no payments in MVP — structure only)
-- ---------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  plan public.subscription_plan not null default 'free',
  status public.subscription_status not null default 'active',
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  amount_cents int not null default 0 check (amount_cents >= 0),
  currency char(3) not null default 'ZAR',
  provider text,
  provider_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subscriptions_business_idx on public.subscriptions (business_id, status);
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 21. notifications (in-app)
-- ---------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, read_at, created_at desc);

-- ---------------------------------------------------------------------
-- 22. audit_logs
-- ---------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------
-- 23. platform_settings
-- ---------------------------------------------------------------------
create table public.platform_settings (
  key text primary key check (key ~ '^[a-z0-9_.]+$'),
  value jsonb not null,
  is_public boolean not null default true,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
create trigger platform_settings_updated_at before update on public.platform_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- POPIA: consent records
-- ---------------------------------------------------------------------
create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  consent_type text not null check (consent_type in ('terms', 'privacy', 'marketing', 'cookies_analytics', 'cookies_ads', 'contact_publication', 'enquiry_processing')),
  granted boolean not null,
  policy_version text not null default '2026-11',
  context text,
  created_at timestamptz not null default now()
);
create index consent_records_user_idx on public.consent_records (user_id, consent_type, created_at desc);

-- POPIA: data subject requests (export / deletion / correction) for traceability
create table public.data_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  email text not null,
  request_type text not null check (request_type in ('export', 'deletion', 'correction', 'objection')),
  status text not null default 'completed' check (status in ('open', 'completed', 'rejected')),
  details text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Rate limiting (works on serverless without Redis)
-- ---------------------------------------------------------------------
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (key, window_start)
);
create index rate_limits_window_idx on public.rate_limits (window_start);
