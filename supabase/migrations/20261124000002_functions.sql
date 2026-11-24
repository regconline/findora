-- =====================================================================
-- FINDORA — helper functions, triggers, search and statistics
-- =====================================================================

-- ---------------------------------------------------------------------
-- Role helpers
-- ---------------------------------------------------------------------
-- True for server-side service-role requests and direct SQL sessions (migrations/seeds).
-- Never true for browser (anon/authenticated) requests.
create or replace function public.is_privileged()
returns boolean language sql stable as $$
  select coalesce(auth.role(), 'none') = 'service_role'
      or (auth.role() is null and auth.uid() is null and current_user in ('postgres', 'supabase_admin'));
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

create or replace function public.can_manage_business(p_business_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1
    from public.business_members m
    join public.profiles p on p.id = m.user_id
    where m.business_id = p_business_id
      and m.user_id = auth.uid()
      and p.status = 'active'
  );
$$;

create or replace function public.is_business_public(p_business_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.businesses
    where id = p_business_id and status = 'approved' and deleted_at is null
  );
$$;

-- ---------------------------------------------------------------------
-- New user → profile (role can only be customer or business_owner here)
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role public.user_role := 'customer';
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  if v_meta ->> 'account_type' = 'business_owner' then
    v_role := 'business_owner';
  end if;

  insert into public.profiles (id, full_name, email, phone, role, terms_accepted_at, marketing_opt_in)
  values (
    new.id,
    left(coalesce(v_meta ->> 'full_name', ''), 120),
    new.email,
    nullif(left(coalesce(v_meta ->> 'phone', ''), 30), ''),
    v_role,
    case when (v_meta ->> 'accepted_terms')::boolean then now() end,
    coalesce((v_meta ->> 'marketing_opt_in')::boolean, false)
  )
  on conflict (id) do nothing;

  if coalesce((v_meta ->> 'accepted_terms')::boolean, false) then
    insert into public.consent_records (user_id, consent_type, granted, context)
    values (new.id, 'terms', true, 'registration'), (new.id, 'privacy', true, 'registration');
  end if;
  if coalesce((v_meta ->> 'marketing_opt_in')::boolean, false) then
    insert into public.consent_records (user_id, consent_type, granted, context)
    values (new.id, 'marketing', true, 'registration');
  end if;

  insert into public.platform_events (event_type, ref_id) values ('registration', new.id);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end $$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------
-- Profile column protection: role/status can never be self-assigned
-- (a customer may upgrade themselves to business_owner, nothing else)
-- ---------------------------------------------------------------------
create or replace function public.protect_profile_columns()
returns trigger language plpgsql as $$
begin
  if public.is_privileged() or public.is_admin() then
    return new;
  end if;
  if not (old.role = 'customer' and new.role = 'business_owner') then
    new.role := old.role;
  end if;
  new.status := old.status;
  new.email := old.email;
  new.deleted_at := old.deleted_at;
  new.created_at := old.created_at;
  return new;
end $$;

create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ---------------------------------------------------------------------
-- Business moderation / monetisation column protection
-- ---------------------------------------------------------------------
create or replace function public.protect_business_insert()
returns trigger language plpgsql as $$
begin
  if public.is_privileged() or public.is_admin() then
    if new.status = 'pending' and new.submitted_at is null then new.submitted_at := now(); end if;
    if new.status = 'approved' and new.approved_at is null then new.approved_at := now(); end if;
    return new;
  end if;
  new.created_by := auth.uid();
  if new.status not in ('draft', 'pending') then new.status := 'draft'; end if;
  if new.status = 'pending' then new.submitted_at := now(); end if;
  new.rejection_reason := null;
  new.approved_at := null;
  new.approved_by := null;
  new.suspended_reason := null;
  new.is_verified := false;
  new.verified_at := null;
  new.verification_notes := null;
  new.plan := 'free';
  new.plan_status := 'active';
  new.plan_expires_at := null;
  new.is_featured := false;
  new.featured_until := null;
  new.is_sponsored := false;
  new.sponsored_until := null;
  new.deleted_at := null;
  return new;
end $$;

create trigger businesses_protect_insert before insert on public.businesses
  for each row execute function public.protect_business_insert();

create or replace function public.protect_business_update()
returns trigger language plpgsql as $$
begin
  -- Nested updates come only from refresh_business_search (search_vector only).
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if public.is_privileged() or public.is_admin() then
    if new.status = 'approved' and old.status is distinct from 'approved' then
      new.approved_at := now();
      new.approved_by := coalesce(new.approved_by, auth.uid());
      new.rejection_reason := null;
      new.suspended_reason := null;
    end if;
    if new.status = 'pending' and old.status is distinct from 'pending' then
      new.submitted_at := now();
    end if;
    if new.is_verified and not old.is_verified then new.verified_at := now(); end if;
    return new;
  end if;

  -- Owners/managers: privileged columns are immutable
  new.slug := old.slug;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.approved_at := old.approved_at;
  new.approved_by := old.approved_by;
  new.rejection_reason := old.rejection_reason;
  new.suspended_reason := old.suspended_reason;
  new.is_verified := old.is_verified;
  new.verified_at := old.verified_at;
  new.verification_notes := old.verification_notes;
  new.plan := old.plan;
  new.plan_status := old.plan_status;
  new.plan_expires_at := old.plan_expires_at;
  new.is_featured := old.is_featured;
  new.featured_until := old.featured_until;
  new.is_sponsored := old.is_sponsored;
  new.sponsored_until := old.sponsored_until;
  new.search_vector := old.search_vector;

  -- Allowed owner status transitions: submit for review, or withdraw to draft.
  if old.status = 'suspended' then
    new.status := old.status;
    new.deleted_at := old.deleted_at; -- suspended listings stay for review
  elsif new.status is distinct from old.status then
    if new.status = 'pending' and old.status in ('draft', 'rejected', 'approved') then
      new.submitted_at := now();
    elsif new.status = 'draft' then
      null; -- unpublish / withdraw
    else
      new.status := old.status;
    end if;
  end if;
  return new;
end $$;

create trigger businesses_protect_update before update on public.businesses
  for each row execute function public.protect_business_update();

-- Creator becomes owner member
create or replace function public.handle_new_business()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.created_by is not null then
    insert into public.business_members (business_id, user_id, role)
    values (new.id, new.created_by, 'owner')
    on conflict do nothing;
  end if;
  return new;
end $$;

create trigger businesses_after_insert after insert on public.businesses
  for each row execute function public.handle_new_business();

-- Unique slug generator
create or replace function public.unique_business_slug(p_base text)
returns text language plpgsql stable security definer set search_path = public, extensions as $$
declare
  v_base text;
  v_slug text;
  v_n int := 1;
begin
  v_base := trim(both '-' from regexp_replace(lower(extensions.unaccent(coalesce(p_base, ''))), '[^a-z0-9]+', '-', 'g'));
  v_base := left(v_base, 70);
  v_base := trim(both '-' from v_base);
  if v_base = '' then v_base := 'business'; end if;
  v_slug := v_base;
  while exists (select 1 from public.businesses where slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;
  return v_slug;
end $$;

-- Enquiry column protection: businesses may only change status; customers may only archive
create or replace function public.protect_enquiry_update()
returns trigger language plpgsql as $$
declare
  v_status public.enquiry_status := new.status;
  v_read timestamptz := new.read_at;
  v_carch boolean := new.customer_archived;
begin
  if public.is_privileged() or public.is_admin() then
    return new;
  end if;
  new := old;
  if public.can_manage_business(old.business_id) then
    new.status := v_status;
    new.read_at := case when v_status <> 'new' then coalesce(old.read_at, now()) else null end;
  end if;
  if old.customer_id = auth.uid() then
    new.customer_archived := v_carch;
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger enquiries_protect before update on public.customer_enquiries
  for each row execute function public.protect_enquiry_update();

-- Report column protection: only admins can change status
create or replace function public.protect_report_insert()
returns trigger language plpgsql as $$
begin
  if public.is_privileged() or public.is_admin() then return new; end if;
  new.status := 'open';
  new.admin_notes := null;
  new.resolved_by := null;
  new.resolved_at := null;
  new.reporter_id := auth.uid();
  return new;
end $$;

create trigger business_reports_protect before insert on public.business_reports
  for each row execute function public.protect_report_insert();

-- ---------------------------------------------------------------------
-- Full-text search vector maintenance
-- ---------------------------------------------------------------------
create or replace function public.refresh_business_search(p_business_id uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  update public.businesses b
  set search_vector =
      setweight(to_tsvector('simple', extensions.unaccent(coalesce(b.name, ''))), 'A')
   || setweight(to_tsvector('simple', extensions.unaccent(
        coalesce(b.tagline, '') || ' ' ||
        coalesce((select c.name from public.categories c where c.id = b.category_id), '') || ' ' ||
        coalesce((select s.name from public.subcategories s where s.id = b.subcategory_id), '') || ' ' ||
        coalesce((select string_agg(sv.name, ' ') from public.services sv where sv.business_id = b.id and sv.is_active), '')
      )), 'B')
   || setweight(to_tsvector('simple', extensions.unaccent(
        coalesce((select string_agg(concat_ws(' ', l.province, l.city, l.town, l.suburb, array_to_string(l.service_areas, ' ')), ' ')
                  from public.business_locations l where l.business_id = b.id), '')
      )), 'C')
   || setweight(to_tsvector('simple', extensions.unaccent(
        left(coalesce(b.description, ''), 4000) || ' ' ||
        left(coalesce((select string_agg(coalesce(sv.description, ''), ' ') from public.services sv where sv.business_id = b.id and sv.is_active), ''), 4000)
      )), 'D')
  where b.id = p_business_id;
end $$;

create or replace function public.trg_business_search_self()
returns trigger language plpgsql as $$
begin
  perform public.refresh_business_search(new.id);
  return null;
end $$;

create trigger businesses_search_insert after insert on public.businesses
  for each row execute function public.trg_business_search_self();
create trigger businesses_search_update after update of name, tagline, description, category_id, subcategory_id on public.businesses
  for each row when (pg_trigger_depth() < 1) execute function public.trg_business_search_self();

create or replace function public.trg_business_search_child()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_business_search(old.business_id);
  else
    perform public.refresh_business_search(new.business_id);
  end if;
  return null;
end $$;

create trigger services_search after insert or update or delete on public.services
  for each row execute function public.trg_business_search_child();
create trigger locations_search after insert or update or delete on public.business_locations
  for each row execute function public.trg_business_search_child();

-- ---------------------------------------------------------------------
-- Search
-- ---------------------------------------------------------------------
create or replace function public.build_search_query(p_query text)
returns tsquery language sql stable set search_path = public, extensions as $$
  select case when count(*) = 0 then null
              else to_tsquery('simple', string_agg(w || ':*', ' & ')) end
  from (
    select w from regexp_split_to_table(
      lower(extensions.unaccent(regexp_replace(coalesce(p_query, ''), '[^[:alnum:][:space:]]', ' ', 'g'))),
      '\s+') as w
    where w <> '' limit 8
  ) words;
$$;

create or replace function public.search_businesses(
  p_query text default null,
  p_category text default null,
  p_subcategory text default null,
  p_province text default null,
  p_city text default null,
  p_business_type public.business_type default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_open_weekends boolean default false,
  p_sort text default 'relevance',
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id uuid, slug text, name text, tagline text, description text,
  logo_path text, cover_path text,
  category_name text, category_slug text, subcategory_name text, subcategory_slug text,
  province text, city text, suburb text,
  is_verified boolean, is_featured boolean, approved_at timestamptz,
  service_count int, min_price numeric, rank real, total_count bigint
)
language sql stable security invoker set search_path = public, extensions as $$
  with q as (
    select public.build_search_query(p_query) as tsq,
           nullif(trim(coalesce(p_query, '')), '') as raw
  ),
  base as (
    select b.*,
           c.name as c_name, c.slug as c_slug, s.name as s_name, s.slug as s_slug,
           l.province as l_province, l.city as l_city, l.suburb as l_suburb,
           case
             when q.tsq is null then 0
             else ts_rank_cd(b.search_vector, q.tsq) + greatest(similarity(b.name, q.raw), 0) * 0.5
           end
           + case when b.logo_path is not null then 0.02 else 0 end
           + case when b.description <> '' and char_length(b.description) > 120 then 0.02 else 0 end
           as rnk
    from public.businesses b
    cross join q
    left join public.categories c on c.id = b.category_id
    left join public.subcategories s on s.id = b.subcategory_id
    left join public.business_locations l on l.business_id = b.id and l.is_primary
    where b.status = 'approved'
      and b.deleted_at is null
      and (q.tsq is null
           or b.search_vector @@ q.tsq
           or b.name % q.raw
           or b.name ilike '%' || q.raw || '%')
      and (p_category is null or c.slug = p_category)
      and (p_subcategory is null or s.slug = p_subcategory
           or exists (select 1 from public.services sv join public.subcategories ss on ss.id = sv.subcategory_id
                      where sv.business_id = b.id and sv.is_active and ss.slug = p_subcategory))
      and (p_province is null or lower(l.province) = lower(p_province))
      and (p_city is null or lower(l.city) = lower(p_city) or lower(l.town) = lower(p_city)
           or lower(l.suburb) = lower(p_city)
           or lower(p_city) = any (select lower(x) from unnest(l.service_areas) x))
      and (p_business_type is null or b.business_type = p_business_type)
      and ((p_min_price is null and p_max_price is null) or exists (
            select 1 from public.services sv
            where sv.business_id = b.id and sv.is_active and sv.price is not null
              and (p_min_price is null or sv.price >= p_min_price)
              and (p_max_price is null or sv.price <= p_max_price)))
      and (not coalesce(p_open_weekends, false) or exists (
            select 1 from public.business_hours h
            where h.business_id = b.id and h.day_of_week in (5, 6) and not h.is_closed))
  )
  select base.id, base.slug, base.name, base.tagline, left(base.description, 300),
         base.logo_path, base.cover_path,
         base.c_name, base.c_slug, base.s_name, base.s_slug,
         base.l_province, base.l_city, base.l_suburb,
         base.is_verified,
         base.is_featured and (base.featured_until is null or base.featured_until > now()),
         base.approved_at,
         (select count(*)::int from public.services sv where sv.business_id = base.id and sv.is_active),
         (select min(sv.price) from public.services sv where sv.business_id = base.id and sv.is_active and sv.price is not null),
         base.rnk::real,
         count(*) over ()
  from base
  order by
    case when p_sort = 'alphabetical' then lower(base.name) end asc,
    case when p_sort = 'recent' then base.approved_at end desc nulls last,
    base.rnk desc,
    base.approved_at desc nulls last,
    base.id
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.search_suggestions(p_query text)
returns table (label text, kind text, slug text, parent_slug text)
language sql stable security invoker set search_path = public, extensions as $$
  with q as (select nullif(trim(coalesce(p_query, '')), '') as raw)
  (select b.name, 'business', b.slug, null::text
   from public.businesses b, q
   where q.raw is not null and char_length(q.raw) >= 2
     and b.status = 'approved' and b.deleted_at is null
     and (b.name ilike q.raw || '%' or b.name ilike '% ' || q.raw || '%' or b.name % q.raw)
   order by similarity(b.name, q.raw) desc limit 5)
  union all
  (select s.name, 'subcategory', s.slug, c.slug
   from public.subcategories s join public.categories c on c.id = s.category_id, q
   where q.raw is not null and char_length(q.raw) >= 2 and s.is_active and c.is_active
     and (s.name ilike q.raw || '%' or s.name ilike '% ' || q.raw || '%')
   order by s.sort_order limit 4)
  union all
  (select c.name, 'category', c.slug, null
   from public.categories c, q
   where q.raw is not null and char_length(q.raw) >= 2 and c.is_active
     and (c.name ilike q.raw || '%' or c.name ilike '% ' || q.raw || '%')
   order by c.sort_order limit 3)
  union all
  (select distinct on (lower(sv.name)) sv.name, 'service', null, null
   from public.services sv join public.businesses b on b.id = sv.business_id, q
   where q.raw is not null and char_length(q.raw) >= 2 and sv.is_active
     and b.status = 'approved' and b.deleted_at is null
     and sv.name ilike '%' || q.raw || '%'
   order by lower(sv.name) limit 4);
$$;

-- Counts of approved businesses per category / subcategory
create or replace function public.category_counts()
returns table (category_id uuid, subcategory_id uuid, business_count bigint)
language sql stable security definer set search_path = public as $$
  select b.category_id, b.subcategory_id, count(*)
  from public.businesses b
  where b.status = 'approved' and b.deleted_at is null
  group by grouping sets ((b.category_id), (b.category_id, b.subcategory_id));
$$;

-- Distinct cities with approved listings (for location filters)
create or replace function public.listed_locations()
returns table (province text, city text, business_count bigint)
language sql stable security definer set search_path = public as $$
  select l.province, l.city, count(*)
  from public.business_locations l
  join public.businesses b on b.id = l.business_id
  where l.is_primary and b.status = 'approved' and b.deleted_at is null
  group by l.province, l.city
  order by count(*) desc, l.city;
$$;

-- ---------------------------------------------------------------------
-- Rate limiting
-- ---------------------------------------------------------------------
create or replace function public.check_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits int;
begin
  insert into public.rate_limits (key, window_start, hits)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;
  -- opportunistic cleanup
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;
  return v_hits <= p_limit;
end $$;
revoke all on function public.check_rate_limit(text, int, int) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Business dashboard statistics (real recorded events only)
-- ---------------------------------------------------------------------
create or replace function public.business_stats(p_business_ids uuid[], p_days int default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_ids uuid[];
  v_since date := ((now() at time zone 'Africa/Johannesburg')::date - (greatest(p_days, 1) - 1));
  v_result jsonb;
begin
  select coalesce(array_agg(x), '{}') into v_ids
  from unnest(p_business_ids) x where public.can_manage_business(x);

  select jsonb_build_object(
    'totals', jsonb_build_object(
      'profile_views', (select count(*) from public.business_views where business_id = any (v_ids) and view_type = 'profile'),
      'service_views', (select count(*) from public.business_views where business_id = any (v_ids) and view_type = 'service'),
      'phone', (select count(*) from public.contact_events where business_id = any (v_ids) and event_type = 'phone'),
      'whatsapp', (select count(*) from public.contact_events where business_id = any (v_ids) and event_type = 'whatsapp'),
      'website', (select count(*) from public.contact_events where business_id = any (v_ids) and event_type = 'website'),
      'email', (select count(*) from public.contact_events where business_id = any (v_ids) and event_type = 'email'),
      'directions', (select count(*) from public.contact_events where business_id = any (v_ids) and event_type = 'directions'),
      'social', (select count(*) from public.contact_events where business_id = any (v_ids) and event_type = 'social'),
      'enquiries', (select count(*) from public.customer_enquiries where business_id = any (v_ids)),
      'unread_enquiries', (select count(*) from public.customer_enquiries where business_id = any (v_ids) and status = 'new')
    ),
    'series', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', d.day,
        'views', (select count(*) from public.business_views v where v.business_id = any (v_ids) and v.view_type = 'profile' and v.viewed_on = d.day),
        'contacts', (select count(*) from public.contact_events e where e.business_id = any (v_ids) and e.occurred_on = d.day),
        'enquiries', (select count(*) from public.customer_enquiries q where q.business_id = any (v_ids)
                       and (q.created_at at time zone 'Africa/Johannesburg')::date = d.day)
      ) order by d.day), '[]'::jsonb)
      from (select generate_series(v_since, (now() at time zone 'Africa/Johannesburg')::date, interval '1 day')::date as day) d
    )
  ) into v_result;
  return v_result;
end $$;

-- ---------------------------------------------------------------------
-- Admin overview statistics
-- ---------------------------------------------------------------------
create or replace function public.admin_overview_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() and not public.is_privileged() then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'users', (select count(*) from public.profiles where deleted_at is null),
    'customers', (select count(*) from public.profiles where role = 'customer' and deleted_at is null),
    'business_owners', (select count(*) from public.profiles where role = 'business_owner' and deleted_at is null),
    'new_users_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'businesses', (select count(*) from public.businesses where deleted_at is null),
    'pending', (select count(*) from public.businesses where status = 'pending' and deleted_at is null),
    'approved', (select count(*) from public.businesses where status = 'approved' and deleted_at is null),
    'suspended', (select count(*) from public.businesses where status = 'suspended' and deleted_at is null),
    'rejected', (select count(*) from public.businesses where status = 'rejected' and deleted_at is null),
    'enquiries', (select count(*) from public.customer_enquiries),
    'enquiries_7d', (select count(*) from public.customer_enquiries where created_at > now() - interval '7 days'),
    'published_articles', (select count(*) from public.blog_posts where status in ('published', 'scheduled') and published_at <= now()),
    'open_reports', (select count(*) from public.business_reports where status in ('open', 'reviewing')),
    'searches_7d', (select count(*) from public.platform_events where event_type = 'search' and created_at > now() - interval '7 days'),
    'home_views_7d', (select count(*) from public.platform_events where event_type = 'home_view' and created_at > now() - interval '7 days'),
    'profile_views_7d', (select count(*) from public.business_views where created_at > now() - interval '7 days'),
    'contacts_7d', (select count(*) from public.contact_events where created_at > now() - interval '7 days')
  );
end $$;

create or replace function public.admin_top_searches(p_days int default 30)
returns table (query text, searches bigint, avg_results numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() and not public.is_privileged() then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  return query
    select lower(e.query), count(*), round(avg(e.result_count), 1)
    from public.platform_events e
    where e.event_type = 'search' and e.query is not null and e.created_at > now() - make_interval(days => p_days)
    group by lower(e.query) order by count(*) desc limit 25;
end $$;
