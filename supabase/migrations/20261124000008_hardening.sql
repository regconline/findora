-- Hardening from the Supabase security advisor.

-- Pin search_path on functions that did not set it
alter function public.set_updated_at() set search_path = public;
alter function public.is_privileged() set search_path = public;
alter function public.protect_profile_columns() set search_path = public;
alter function public.protect_business_insert() set search_path = public;
alter function public.protect_business_update() set search_path = public;
alter function public.protect_enquiry_update() set search_path = public;
alter function public.protect_report_insert() set search_path = public;
alter function public.trg_business_search_self() set search_path = public;
alter function public.trg_business_search_child() set search_path = public;
alter function public.storage_business_id(text) set search_path = public;

-- Trigger-only functions must never be callable through the API
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;
revoke execute on function public.handle_new_business() from public, anon, authenticated;

-- Internal helpers: not needed by anonymous visitors
revoke execute on function public.refresh_business_search(uuid) from public, anon;
revoke execute on function public.unique_business_slug(text) from public, anon;
grant execute on function public.refresh_business_search(uuid) to authenticated, service_role;
grant execute on function public.unique_business_slug(text) to authenticated, service_role;

-- Intentionally kept executable (documented):
--   is_admin, can_manage_business, is_business_public  -> used inside RLS policies (must run as caller)
--   category_counts, listed_locations                  -> public aggregate counts of approved listings only
--   admin_overview_stats, admin_top_searches           -> check is_admin() internally
--   business_stats                                     -> filters to businesses the caller manages
-- public.rate_limits has RLS with no policies on purpose: only check_rate_limit() (service role) touches it.
