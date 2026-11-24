-- =====================================================================
-- Security / RLS test-suite. Every block raises on failure.
-- Identities are simulated exactly as PostgREST does it: SET ROLE + JWT claims.
-- =====================================================================
\set ON_ERROR_STOP 1

-- fixtures ---------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a', 'alice@example.com', '{"full_name":"Alice Customer","accepted_terms":true}'),
 ('00000000-0000-0000-0000-00000000000b', 'bob@example.com',   '{"full_name":"Bob Owner","account_type":"business_owner","accepted_terms":true}'),
 ('00000000-0000-0000-0000-00000000000c', 'carol@example.com', '{"full_name":"Carol Owner","account_type":"business_owner"}'),
 ('00000000-0000-0000-0000-0000000000ad', 'admin@example.com', '{"full_name":"Ada Admin","account_type":"admin"}');

do $$ begin
  if (select role from public.profiles where email = 'admin@example.com') <> 'customer' then
    raise exception 'FAIL: signup metadata must not grant admin';
  end if;
  if (select role from public.profiles where email = 'bob@example.com') <> 'business_owner' then
    raise exception 'FAIL: business_owner signup';
  end if;
  if (select count(*) from public.consent_records where user_id = '00000000-0000-0000-0000-00000000000a') <> 2 then
    raise exception 'FAIL: consent records on registration';
  end if;
end $$;
-- admin is promoted server-side only
update public.profiles set role = 'admin' where email = 'admin@example.com';

-- ---------------------------------------------------------------------
-- Bob creates a business and tries to self-approve / self-verify
-- ---------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', false);

insert into public.businesses (id, slug, name, description, category_id, status, is_verified, is_featured, plan, phone, contact_publish_consent)
select '10000000-0000-0000-0000-000000000001', public.unique_business_slug('Bob''s Plumbing Klerksdorp'),
       'Bob''s Plumbing', 'Reliable residential plumbing, geyser installations and leak detection in the Matlosana area.',
       c.id, 'approved', true, true, 'premium', '0181234567', true
from public.categories c where c.slug = 'construction-and-contractors';

insert into public.business_locations (business_id, province, city, suburb, postal_code)
values ('10000000-0000-0000-0000-000000000001', 'North West', 'Klerksdorp', 'Flamwood', '2571');
insert into public.services (business_id, name, description, price, price_type)
values ('10000000-0000-0000-0000-000000000001', 'Geyser installation', 'Supply and install of 150L geysers', 4500, 'starting_from'),
       ('10000000-0000-0000-0000-000000000001', 'Leak detection', 'Non-invasive leak detection', 850, 'fixed');
insert into public.business_hours (business_id, day_of_week, opens_at, closes_at)
values ('10000000-0000-0000-0000-000000000001', 5, '08:00', '13:00');

do $$ declare b record; begin
  select * into b from public.businesses where id = '10000000-0000-0000-0000-000000000001';
  if b.status <> 'draft' then raise exception 'FAIL: owner set status=% on insert', b.status; end if;
  if b.is_verified or b.is_featured or b.plan <> 'free' then raise exception 'FAIL: owner set privileged flags'; end if;
  if b.slug <> 'bob-s-plumbing-klerksdorp' then raise exception 'FAIL: slug %', b.slug; end if;
  if b.search_vector is null or not (b.search_vector @@ to_tsquery('simple', 'geyser:*')) then
    raise exception 'FAIL: search vector not maintained from services';
  end if;
  if not (b.search_vector @@ to_tsquery('simple', 'klerksdorp')) then raise exception 'FAIL: location not in search vector'; end if;
  if not exists (select 1 from public.business_members where business_id = b.id and user_id = auth.uid() and role = 'owner') then
    raise exception 'FAIL: owner membership not created';
  end if;
end $$;

-- try to approve own listing → stays pending
update public.businesses set status = 'pending' where id = '10000000-0000-0000-0000-000000000001';
update public.businesses set status = 'approved', is_verified = true where id = '10000000-0000-0000-0000-000000000001';
do $$ begin
  if (select status from public.businesses where id = '10000000-0000-0000-0000-000000000001') <> 'pending' then
    raise exception 'FAIL: owner could approve own business';
  end if;
  if (select submitted_at from public.businesses where id = '10000000-0000-0000-0000-000000000001') is null then
    raise exception 'FAIL: submitted_at not set';
  end if;
end $$;

-- try to become admin
update public.profiles set role = 'admin', status = 'active' where id = auth.uid();
do $$ begin
  if (select role from public.profiles where id = auth.uid()) <> 'business_owner' then
    raise exception 'FAIL: user escalated own role';
  end if;
  if public.is_admin() then raise exception 'FAIL: is_admin true for owner'; end if;
end $$;

-- ---------------------------------------------------------------------
-- Carol must not touch Bob's business
-- ---------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', false);
do $$ declare n int; begin
  update public.businesses set name = 'Hacked' where id = '10000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: cross-account business update'; end if;
  if exists (select 1 from public.businesses where id = '10000000-0000-0000-0000-000000000001') then
    raise exception 'FAIL: pending business visible to other user';
  end if;
  begin
    insert into public.services (business_id, name) values ('10000000-0000-0000-0000-000000000001', 'Injected');
    raise exception 'FAIL: cross-account service insert';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.business_members (business_id, user_id) values ('10000000-0000-0000-0000-000000000001', auth.uid());
    raise exception 'FAIL: self-granted membership';
  exception when insufficient_privilege then null; end;
  begin
    insert into storage.objects (bucket_id, name) values ('business-logos', '10000000-0000-0000-0000-000000000001/logo.webp');
    raise exception 'FAIL: cross-account storage upload';
  exception when insufficient_privilege then null; end;
  begin
    perform public.admin_overview_stats();
    raise exception 'FAIL: non-admin read admin stats';
  exception when insufficient_privilege then null; end;
end $$;

-- ---------------------------------------------------------------------
-- Anonymous visitors cannot see unapproved listings
-- ---------------------------------------------------------------------
reset role; select set_config('request.jwt.claims', '', false);
set role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', false);
do $$ begin
  if exists (select 1 from public.businesses) then raise exception 'FAIL: anon sees unapproved business'; end if;
  if exists (select 1 from public.services) then raise exception 'FAIL: anon sees services of unapproved business'; end if;
  if (select count(*) from public.search_businesses('plumbing')) <> 0 then raise exception 'FAIL: unapproved in search'; end if;
end $$;

-- ---------------------------------------------------------------------
-- Admin approves
-- ---------------------------------------------------------------------
reset role; select set_config('request.jwt.claims', '', false);
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}', false);
update public.businesses set status = 'approved' where id = '10000000-0000-0000-0000-000000000001';
do $$ begin
  if (select approved_at from public.businesses where id = '10000000-0000-0000-0000-000000000001') is null then
    raise exception 'FAIL: approved_at not set';
  end if;
  if (public.admin_overview_stats() ->> 'approved')::int <> 1 then raise exception 'FAIL: admin stats'; end if;
end $$;

-- ---------------------------------------------------------------------
-- Public search + enquiries
-- ---------------------------------------------------------------------
reset role; select set_config('request.jwt.claims', '', false);
set role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', false);
do $$ declare r record; begin
  if (select count(*) from public.search_businesses('plumb')) <> 1 then raise exception 'FAIL: prefix search'; end if;
  if (select count(*) from public.search_businesses('geyser install')) <> 1 then raise exception 'FAIL: service search'; end if;
  if (select count(*) from public.search_businesses(null, 'construction-and-contractors', null, 'north west')) <> 1 then raise exception 'FAIL: category+province filter'; end if;
  if (select count(*) from public.search_businesses(null, null, null, 'Gauteng')) <> 0 then raise exception 'FAIL: province filter excludes'; end if;
  if (select count(*) from public.search_businesses(null, null, null, null, 'klerksdorp')) <> 1 then raise exception 'FAIL: city filter'; end if;
  if (select count(*) from public.search_businesses(p_min_price => 1000)) <> 1 then raise exception 'FAIL: price filter'; end if;
  if (select count(*) from public.search_businesses(p_max_price => 100)) <> 0 then raise exception 'FAIL: price filter excl'; end if;
  if (select count(*) from public.search_businesses(p_open_weekends => true)) <> 1 then raise exception 'FAIL: weekend filter'; end if;
  if (select count(*) from public.search_businesses('zzzznotfound')) <> 0 then raise exception 'FAIL: no-results'; end if;
  select * into r from public.search_businesses('plumbing');
  if r.total_count <> 1 or r.service_count <> 2 or r.min_price <> 850 or r.is_featured then raise exception 'FAIL: search row %', row_to_json(r); end if;
  if not exists (select 1 from public.search_suggestions('plu')) then raise exception 'FAIL: suggestions'; end if;
  if (select count(*) from public.services) <> 2 then raise exception 'FAIL: public services'; end if;
  -- enquiry as anonymous visitor
  insert into public.customer_enquiries (business_id, name, email, subject, message)
  values ('10000000-0000-0000-0000-000000000001', 'Visitor', 'v@example.com', 'Quote', 'Please quote for a new geyser.');
  if exists (select 1 from public.customer_enquiries) then raise exception 'FAIL: anon can read enquiries'; end if;
  begin
    insert into public.business_views (business_id, visitor_hash) values ('10000000-0000-0000-0000-000000000001', 'x');
    raise exception 'FAIL: anon wrote analytics directly';
  exception when insufficient_privilege then null; end;
  insert into public.business_reports (business_id, reason, details, status)
  values ('10000000-0000-0000-0000-000000000001', 'incorrect_information', 'The phone number is wrong.', 'resolved');
end $$;

reset role; select set_config('request.jwt.claims', '', false);
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', false);
insert into public.customer_enquiries (business_id, customer_id, name, email, subject, message)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Alice', 'alice@example.com', 'Leak', 'There is a leak under my kitchen sink.');
insert into public.saved_businesses (user_id, business_id) values (auth.uid(), '10000000-0000-0000-0000-000000000001');
do $$ begin
  if (select count(*) from public.customer_enquiries) <> 1 then raise exception 'FAIL: customer sees other enquiries'; end if;
  begin
    insert into public.customer_enquiries (business_id, customer_id, name, email, subject, message)
    values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 'Fake', 'f@example.com', 'Spoof', 'Spoofing another customer id.');
    raise exception 'FAIL: spoofed customer_id';
  exception when insufficient_privilege then null; end;
  -- customer can archive but not rewrite
  update public.customer_enquiries set customer_archived = true, message = 'rewritten message text', status = 'archived';
  if (select message from public.customer_enquiries) <> 'There is a leak under my kitchen sink.' then raise exception 'FAIL: customer rewrote enquiry'; end if;
  if (select status from public.customer_enquiries) <> 'new' then raise exception 'FAIL: customer changed business status'; end if;
  if not (select customer_archived from public.customer_enquiries) then raise exception 'FAIL: customer archive'; end if;
  -- customer → business owner upgrade allowed, → admin blocked
  update public.profiles set role = 'business_owner' where id = auth.uid();
  if (select role from public.profiles where id = auth.uid()) <> 'business_owner' then raise exception 'FAIL: upgrade to owner'; end if;
  if (select count(*) from public.business_reports) <> 0 then raise exception 'FAIL: user sees anon reports'; end if;
end $$;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', false);
do $$ begin
  if exists (select 1 from public.customer_enquiries) then raise exception 'FAIL: other owner sees enquiries'; end if;
  if exists (select 1 from public.saved_businesses) then raise exception 'FAIL: sees others saved'; end if;
  if (public.business_stats(array['10000000-0000-0000-0000-000000000001'::uuid]) -> 'totals' ->> 'enquiries')::int <> 0 then
    raise exception 'FAIL: stats leak to non-manager';
  end if;
end $$;

-- Bob reads and manages his enquiries
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', false);
insert into storage.objects (bucket_id, name) values ('business-logos', '10000000-0000-0000-0000-000000000001/logo.webp');
do $$ begin
  if (select count(*) from public.customer_enquiries) <> 2 then raise exception 'FAIL: owner enquiries count'; end if;
  update public.customer_enquiries set status = 'read', message = 'tampered message body';
  if exists (select 1 from public.customer_enquiries where message = 'tampered message body') then raise exception 'FAIL: owner rewrote enquiry'; end if;
  if exists (select 1 from public.customer_enquiries where status <> 'read' or read_at is null) then raise exception 'FAIL: mark read'; end if;
  if (public.business_stats(array['10000000-0000-0000-0000-000000000001'::uuid]) -> 'totals' ->> 'enquiries')::int <> 2 then
    raise exception 'FAIL: owner stats';
  end if;
  if exists (select 1 from public.business_reports) then raise exception 'FAIL: owner sees reports'; end if;
end $$;

reset role; select set_config('request.jwt.claims', '', false);
do $$ begin
  if (select status from public.business_reports limit 1) <> 'open' then raise exception 'FAIL: reporter set status'; end if;
end $$;

-- Suspended owner loses management rights
update public.profiles set status = 'suspended' where email = 'bob@example.com';
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', false);
do $$ declare n int; begin
  update public.services set name = 'xx' where business_id = '10000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: suspended user edited services'; end if;
end $$;
reset role; select set_config('request.jwt.claims', '', false);
update public.profiles set status = 'active' where email = 'bob@example.com';

-- Rate limiter
do $$ begin
  if not public.check_rate_limit('t', 2, 60) or not public.check_rate_limit('t', 2, 60) then raise exception 'FAIL: rate limit allow'; end if;
  if public.check_rate_limit('t', 2, 60) then raise exception 'FAIL: rate limit block'; end if;
end $$;

-- Scheduled blog posts are hidden until their publication time
insert into public.blog_posts (slug, title, content, status, published_at) values
  ('future-post', 'A future scheduled post', 'x', 'scheduled', now() + interval '1 day'),
  ('past-post', 'A past scheduled post', 'x', 'scheduled', now() - interval '1 hour');
set role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', false);
do $$ begin
  if exists (select 1 from public.blog_posts where slug = 'future-post') then raise exception 'FAIL: future post visible'; end if;
  if not exists (select 1 from public.blog_posts where slug = 'past-post') then raise exception 'FAIL: due post hidden'; end if;
end $$;
reset role; select set_config('request.jwt.claims', '', false);
delete from public.blog_posts where slug in ('future-post', 'past-post');

\echo '  ✓ RLS & security suite passed'
