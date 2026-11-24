import "server-only";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { Profile, Business } from "@/lib/types";

/** Verified user from the auth server (not just the cookie). Cached per request. */
export const getUser = cache(async () => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return (data as Profile) ?? null;
});

export async function requireUser(next = "/dashboard") {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.status !== "active") redirect("/account-suspended");
  return { user, profile };
}

/** Admin access is decided by the server-side `role` column (never user-editable). */
export async function requireAdmin() {
  const { user, profile } = await requireUser("/admin");
  if (profile.role !== "admin") notFound();
  return { user, profile };
}

/** Loads a business the current user is allowed to manage (RLS + explicit membership check). */
export async function requireManagedBusiness(businessId: string) {
  const { user, profile } = await requireUser(`/dashboard/businesses/${businessId}`);
  if (!/^[0-9a-f-]{36}$/i.test(businessId)) notFound();
  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("can_manage_business", { p_business_id: businessId });
  if (!allowed) notFound();
  const { data: business } = await supabase.from("businesses").select("*").eq("id", businessId).is("deleted_at", null).maybeSingle();
  if (!business) notFound();
  return { user, profile, business: business as Business, supabase };
}

export const getManagedBusinesses = cache(async () => {
  const user = await getUser();
  if (!user) return [] as Pick<Business, "id" | "name" | "slug" | "status" | "logo_path">[];
  const supabase = await createClient();
  const { data } = await supabase
    .from("business_members")
    .select("business:businesses!inner(id, name, slug, status, logo_path, deleted_at, created_at)")
    .eq("user_id", user.id);
  type Row = { business: Pick<Business, "id" | "name" | "slug" | "status" | "logo_path" | "deleted_at" | "created_at"> };
  return ((data as unknown as Row[]) ?? [])
    .map((r) => r.business)
    .filter((b) => !b.deleted_at)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
});
