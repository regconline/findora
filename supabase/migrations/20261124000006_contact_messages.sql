-- Messages sent through the public Contact Us form (kept so nothing is lost if email is unavailable)
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) <= 254),
  topic text not null check (topic in ('general', 'business', 'privacy', 'advertising', 'report')),
  message text not null check (char_length(message) between 10 and 4000),
  user_id uuid references public.profiles (id) on delete set null,
  status text not null default 'new' check (status in ('new', 'handled')),
  handled_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index contact_messages_status_idx on public.contact_messages (status, created_at desc);
alter table public.contact_messages enable row level security;
create policy "contact messages: admin read" on public.contact_messages for select using (public.is_admin());
create policy "contact messages: admin update" on public.contact_messages for update using (public.is_admin()) with check (public.is_admin());
create policy "contact messages: admin delete" on public.contact_messages for delete using (public.is_admin());
-- inserts happen server-side after validation and rate limiting (service role)
