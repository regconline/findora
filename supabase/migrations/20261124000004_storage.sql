-- =====================================================================
-- FINDORA — Storage buckets and policies
-- Path convention: <bucket>/<business_id>/<file>  (avatars: <user_id>/<file>)
-- Uploads go through the Next.js server, which validates, resizes and
-- re-encodes images before writing. These policies are defence in depth.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('business-logos',   'business-logos',   true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('business-covers',  'business-covers',  true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('business-gallery', 'business-gallery', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('avatars',          'avatars',          true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('site-media',       'site-media',       true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Safe uuid parse of the first folder segment
create or replace function public.storage_business_id(p_name text)
returns uuid language plpgsql immutable as $$
begin
  return (string_to_array(p_name, '/'))[1]::uuid;
exception when others then
  return null;
end $$;

-- Public read for the public buckets is handled by `public = true`.

create policy "business media: managers insert" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('business-logos', 'business-covers', 'business-gallery')
    and public.can_manage_business(public.storage_business_id(name))
  );
create policy "business media: managers update" on storage.objects for update to authenticated
  using (
    bucket_id in ('business-logos', 'business-covers', 'business-gallery')
    and public.can_manage_business(public.storage_business_id(name))
  );
create policy "business media: managers delete" on storage.objects for delete to authenticated
  using (
    bucket_id in ('business-logos', 'business-covers', 'business-gallery')
    and public.can_manage_business(public.storage_business_id(name))
  );

create policy "avatars: own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and public.storage_business_id(name) = auth.uid());
create policy "avatars: own update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and public.storage_business_id(name) = auth.uid());
create policy "avatars: own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and public.storage_business_id(name) = auth.uid());

create policy "site media: admin write" on storage.objects for all to authenticated
  using (bucket_id = 'site-media' and public.is_admin())
  with check (bucket_id = 'site-media' and public.is_admin());
