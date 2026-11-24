import "server-only";
import { createClient } from "@/lib/supabase/server";

export type BusinessStats = {
  totals: {
    profile_views: number; service_views: number; phone: number; whatsapp: number; website: number;
    email: number; directions: number; social: number; enquiries: number; unread_enquiries: number;
  };
  series: { day: string; views: number; contacts: number; enquiries: number }[];
};

const EMPTY: BusinessStats = {
  totals: { profile_views: 0, service_views: 0, phone: 0, whatsapp: 0, website: 0, email: 0, directions: 0, social: 0, enquiries: 0, unread_enquiries: 0 },
  series: [],
};

/** Real recorded events only — computed in Postgres; RLS/ownership enforced in the function. */
export async function getBusinessStats(ids: string[], days = 30): Promise<BusinessStats> {
  if (!ids.length) return EMPTY;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("business_stats", { p_business_ids: ids, p_days: days });
  if (error || !data) return EMPTY;
  return data as BusinessStats;
}
