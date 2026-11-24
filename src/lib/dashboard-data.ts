import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { BusinessProfile } from "@/lib/data";
import type { Business, BusinessHour, BusinessImage, BusinessLocation, Service } from "@/lib/types";

/** Full business record for owners (includes drafts), using the user's session (RLS enforced). */
export async function getManagedBusinessProfile(id: string): Promise<BusinessProfile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select(
      `*, category:categories(id, name, slug), subcategory:subcategories(id, name, slug),
       business_locations(*), business_hours(*), services(*, subcategory:subcategories(name, slug)), business_images(*)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const b = data as Business & {
    category: BusinessProfile["category"];
    subcategory: BusinessProfile["subcategory"];
    business_locations: (BusinessLocation & { is_primary: boolean })[];
    business_hours: BusinessHour[];
    services: BusinessProfile["services"];
    business_images: BusinessImage[];
  };
  return {
    ...b,
    location: b.business_locations.find((l) => l.is_primary) ?? b.business_locations[0] ?? null,
    hours: [...b.business_hours].sort((x, y) => x.day_of_week - y.day_of_week),
    services: [...b.services].sort((x, y) => x.sort_order - y.sort_order) as (Service & { subcategory?: { name: string; slug: string } | null })[],
    images: b.business_images.filter((i) => i.kind === "gallery").sort((x, y) => x.sort_order - y.sort_order),
  };
}
