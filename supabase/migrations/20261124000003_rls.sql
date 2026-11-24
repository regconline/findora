-- =====================================================================
-- FINDORA — Row Level Security
-- Every table has RLS enabled. Tables without a policy for an operation
-- deny it to anon/authenticated; server code uses the service role only
-- for narrowly scoped, validated operations (analytics, rate limits, emails).
-- =====================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','categories','subcategories','businesses','business_members','business_locations',
    'business_hours','services','business_images','customer_enquiries','saved_businesses',
    'business_reports','business_views','contact_events','platform_events','blog_categories',
    'blog_posts','faqs','site_pages','advertisements','subscriptions','notifications','audit_logs',
    'platform_settings','consent_records','data_requests','rate_limits'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- profiles ------------------------------------------------------------
create policy "profiles: read own" on public.profiles for select
  using (id = auth.uid() or public.is_admin());
create policy "profiles: update own" on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- categories / subcategories -------------------------------------------
create policy "categories: public read active" on public.categories for select
  using (is_active or public.is_admin());
create policy "categories: admin write" on public.categories for all
  using (public.is_admin()) with check (public.is_admin());

create policy "subcategories: public read active" on public.subcategories for select
  using (is_active or public.is_admin());
create policy "subcategories: admin write" on public.subcategories for all
  using (public.is_admin()) with check (public.is_admin());

-- businesses -----------------------------------------------------------
create policy "businesses: public read approved" on public.businesses for select
  using (
    (status = 'approved' and deleted_at is null)
    or created_by = auth.uid()
    or public.can_manage_business(id)
  );
create policy "businesses: owners create" on public.businesses for insert
  with check (
    auth.uid() is not null
    and created_by = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active')
  );
create policy "businesses: managers update" on public.businesses for update
  using (public.can_manage_business(id))
  with check (public.can_manage_business(id));
create policy "businesses: admin delete" on public.businesses for delete
  using (public.is_admin());

-- business_members -----------------------------------------------------
create policy "members: read own memberships" on public.business_members for select
  using (user_id = auth.uid() or public.can_manage_business(business_id));
create policy "members: admin manage" on public.business_members for all
  using (public.is_admin()) with check (public.is_admin());

-- child tables of businesses --------------------------------------------
create policy "locations: public read" on public.business_locations for select
  using (public.is_business_public(business_id) or public.can_manage_business(business_id));
create policy "locations: managers write" on public.business_locations for all
  using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));

create policy "hours: public read" on public.business_hours for select
  using (public.is_business_public(business_id) or public.can_manage_business(business_id));
create policy "hours: managers write" on public.business_hours for all
  using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));

create policy "services: public read" on public.services for select
  using ((is_active and public.is_business_public(business_id)) or public.can_manage_business(business_id));
create policy "services: managers write" on public.services for all
  using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));

create policy "images: public read" on public.business_images for select
  using ((not is_hidden and public.is_business_public(business_id)) or public.can_manage_business(business_id));
create policy "images: managers write" on public.business_images for all
  using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));

-- customer_enquiries ---------------------------------------------------
create policy "enquiries: customer or business reads" on public.customer_enquiries for select
  using (customer_id = auth.uid() or public.can_manage_business(business_id));
create policy "enquiries: submit to public businesses" on public.customer_enquiries for insert
  with check (
    public.is_business_public(business_id)
    and (customer_id is null or customer_id = auth.uid())
    and status = 'new'
  );
create policy "enquiries: update status" on public.customer_enquiries for update
  using (customer_id = auth.uid() or public.can_manage_business(business_id))
  with check (customer_id = auth.uid() or public.can_manage_business(business_id));
create policy "enquiries: admin delete" on public.customer_enquiries for delete
  using (public.is_admin());

-- saved_businesses -----------------------------------------------------
create policy "saved: own read" on public.saved_businesses for select
  using (user_id = auth.uid());
create policy "saved: own insert" on public.saved_businesses for insert
  with check (user_id = auth.uid() and public.is_business_public(business_id));
create policy "saved: own delete" on public.saved_businesses for delete
  using (user_id = auth.uid());

-- business_reports -----------------------------------------------------
create policy "reports: anyone submits" on public.business_reports for insert
  with check (reporter_id is null or reporter_id = auth.uid());
create policy "reports: reporter or admin reads" on public.business_reports for select
  using ((reporter_id is not null and reporter_id = auth.uid()) or public.is_admin());
create policy "reports: admin manages" on public.business_reports for update
  using (public.is_admin()) with check (public.is_admin());
create policy "reports: admin deletes" on public.business_reports for delete
  using (public.is_admin());

-- analytics (inserted server-side; readable by business managers/admins) -
create policy "views: managers read" on public.business_views for select
  using (public.can_manage_business(business_id));
create policy "contacts: managers read" on public.contact_events for select
  using (public.can_manage_business(business_id));
create policy "platform events: admin read" on public.platform_events for select
  using (public.is_admin());

-- blog / cms ----------------------------------------------------------
create policy "blog categories: public read" on public.blog_categories for select using (true);
create policy "blog categories: admin write" on public.blog_categories for all
  using (public.is_admin()) with check (public.is_admin());

create policy "blog posts: public read published" on public.blog_posts for select
  using ((status in ('published', 'scheduled') and published_at is not null and published_at <= now()) or public.is_admin());
create policy "blog posts: admin write" on public.blog_posts for all
  using (public.is_admin()) with check (public.is_admin());

create policy "faqs: public read" on public.faqs for select using (is_published or public.is_admin());
create policy "faqs: admin write" on public.faqs for all
  using (public.is_admin()) with check (public.is_admin());

create policy "pages: public read" on public.site_pages for select using (is_published or public.is_admin());
create policy "pages: admin write" on public.site_pages for all
  using (public.is_admin()) with check (public.is_admin());

-- advertisements -------------------------------------------------------
create policy "ads: public read active" on public.advertisements for select
  using ((is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())) or public.is_admin());
create policy "ads: admin write" on public.advertisements for all
  using (public.is_admin()) with check (public.is_admin());

-- subscriptions --------------------------------------------------------
create policy "subscriptions: managers read" on public.subscriptions for select
  using (public.can_manage_business(business_id));
create policy "subscriptions: admin write" on public.subscriptions for all
  using (public.is_admin()) with check (public.is_admin());

-- notifications --------------------------------------------------------
create policy "notifications: own read" on public.notifications for select using (user_id = auth.uid());
create policy "notifications: own update" on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications: own delete" on public.notifications for delete using (user_id = auth.uid());

-- audit_logs (append-only; written server-side) -------------------------
create policy "audit: admin read" on public.audit_logs for select using (public.is_admin());

-- platform_settings ----------------------------------------------------
create policy "settings: public read" on public.platform_settings for select using (is_public or public.is_admin());
create policy "settings: admin write" on public.platform_settings for all
  using (public.is_admin()) with check (public.is_admin());

-- consent / data requests ----------------------------------------------
create policy "consent: own read" on public.consent_records for select using (user_id = auth.uid() or public.is_admin());
create policy "consent: own insert" on public.consent_records for insert with check (user_id = auth.uid());
create policy "data requests: own read" on public.data_requests for select using (user_id = auth.uid() or public.is_admin());

-- rate_limits: no policies (accessed only via security-definer function)

-- Function execution grants ---------------------------------------------
revoke execute on function public.admin_overview_stats() from public, anon;
revoke execute on function public.admin_top_searches(int) from public, anon;
revoke execute on function public.business_stats(uuid[], int) from public, anon;
grant execute on function public.admin_overview_stats() to authenticated, service_role;
grant execute on function public.admin_top_searches(int) to authenticated, service_role;
grant execute on function public.business_stats(uuid[], int) to authenticated, service_role;
grant execute on function public.check_rate_limit(text, int, int) to service_role;
