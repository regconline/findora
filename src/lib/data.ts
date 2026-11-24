import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type {
  BlogPost, Business, BusinessHour, BusinessImage, BusinessLocation, Category, Faq, SearchResult, Service, SitePage, Subcategory,
} from "@/lib/types";

/** Public, cookie-less reads (RLS: anon). Errors degrade to empty results and are logged. */
function db() {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured");
  return createPublicClient();
}

async function safe<T>(label: string, fallback: T, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    console.error(`[data:${label}]`, e instanceof Error ? e.message : e);
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
export const getCategories = cache(async (): Promise<Category[]> =>
  safe("categories", [], async () => {
    const { data, error } = await db()
      .from("categories")
      .select("*, subcategories(*)")
      .eq("is_active", true)
      .order("sort_order")
      .order("sort_order", { referencedTable: "subcategories" });
    if (error) throw error;
    return ((data as Category[]) ?? []).map((c) => ({
      ...c,
      subcategories: (c.subcategories ?? []).filter((s) => s.is_active),
    }));
  }),
);

export const getCategoryCounts = cache(async () =>
  safe("category_counts", { byCategory: new Map<string, number>(), bySub: new Map<string, number>() }, async () => {
    const { data, error } = await db().rpc("category_counts");
    if (error) throw error;
    const byCategory = new Map<string, number>();
    const bySub = new Map<string, number>();
    for (const r of (data as { category_id: string | null; subcategory_id: string | null; business_count: number }[]) ?? []) {
      if (!r.category_id) continue;
      if (r.subcategory_id) bySub.set(r.subcategory_id, Number(r.business_count));
      else byCategory.set(r.category_id, Number(r.business_count));
    }
    return { byCategory, bySub };
  }),
);

export async function getCategoryBySlug(slug: string) {
  const cats = await getCategories();
  return cats.find((c) => c.slug === slug) ?? null;
}

export async function findSubcategory(slug: string): Promise<{ category: Category; sub: Subcategory } | null> {
  for (const category of await getCategories()) {
    const sub = category.subcategories?.find((s) => s.slug === slug);
    if (sub) return { category, sub };
  }
  return null;
}

export const getListedLocations = cache(async () =>
  safe("locations", [] as { province: string; city: string; business_count: number }[], async () => {
    const { data, error } = await db().rpc("listed_locations");
    if (error) throw error;
    return (data as { province: string; city: string; business_count: number }[]) ?? [];
  }),
);

// ---------------------------------------------------------------------------
// Search & listings
// ---------------------------------------------------------------------------
export type SearchParams = {
  q?: string;
  category?: string;
  subcategory?: string;
  province?: string;
  city?: string;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  weekends?: boolean;
  sort?: string;
  page?: number;
  pageSize?: number;
};

export async function searchBusinesses(p: SearchParams): Promise<{ results: SearchResult[]; total: number }> {
  return safe("search", { results: [], total: 0 }, async () => {
    const pageSize = p.pageSize ?? 18;
    const page = Math.max(1, p.page ?? 1);
    const { data, error } = await db().rpc("search_businesses", {
      p_query: p.q || null,
      p_category: p.category || null,
      p_subcategory: p.subcategory || null,
      p_province: p.province || null,
      p_city: p.city || null,
      p_business_type: p.type || null,
      p_min_price: p.minPrice ?? null,
      p_max_price: p.maxPrice ?? null,
      p_open_weekends: p.weekends ?? false,
      p_sort: p.sort || "relevance",
      p_limit: pageSize,
      p_offset: (page - 1) * pageSize,
    });
    if (error) throw error;
    const results = (data as SearchResult[]) ?? [];
    return { results, total: results[0] ? Number(results[0].total_count) : 0 };
  });
}

export const getRecentBusinesses = cache(async (limit = 6) => (await searchBusinesses({ sort: "recent", pageSize: limit })).results);

export const getFeaturedBusinesses = cache(async (limit = 6): Promise<SearchResult[]> =>
  safe("featured", [], async () => {
    const { data, error } = await db()
      .from("businesses")
      .select("id, slug, name, tagline, description, logo_path, cover_path, is_verified, is_featured, featured_until, approved_at, categories(name, slug), business_locations(province, city, suburb, is_primary)")
      .eq("status", "approved")
      .eq("is_featured", true)
      .is("deleted_at", null)
      .or(`featured_until.is.null,featured_until.gt.${new Date().toISOString()}`)
      .limit(limit);
    if (error) throw error;
    type Row = Business & { categories: { name: string; slug: string } | null; business_locations: BusinessLocation[] };
    return ((data as unknown as Row[]) ?? []).map((b) => {
      const loc = b.business_locations?.find((l) => (l as BusinessLocation & { is_primary: boolean }).is_primary) ?? b.business_locations?.[0];
      return {
        id: b.id, slug: b.slug, name: b.name, tagline: b.tagline, description: b.description,
        logo_path: b.logo_path, cover_path: b.cover_path,
        category_name: b.categories?.name ?? null, category_slug: b.categories?.slug ?? null,
        subcategory_name: null, subcategory_slug: null,
        province: loc?.province ?? null, city: loc?.city ?? null, suburb: loc?.suburb ?? null,
        is_verified: b.is_verified, is_featured: true, approved_at: b.approved_at,
        service_count: 0, min_price: null, rank: 0, total_count: 0,
      };
    });
  }),
);

export type BusinessProfile = Business & {
  category: Pick<Category, "id" | "name" | "slug"> | null;
  subcategory: Pick<Subcategory, "id" | "name" | "slug"> | null;
  location: BusinessLocation | null;
  hours: BusinessHour[];
  services: (Service & { subcategory?: { name: string; slug: string } | null })[];
  images: BusinessImage[];
};

export const getBusinessBySlug = cache(async (slug: string): Promise<BusinessProfile | null> =>
  safe("business", null, async () => {
    const { data, error } = await db()
      .from("businesses")
      .select(
        `*, category:categories(id, name, slug), subcategory:subcategories(id, name, slug),
         business_locations(*), business_hours(*), services(*, subcategory:subcategories(name, slug)), business_images(*)`,
      )
      .eq("slug", slug)
      .eq("status", "approved")
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
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
      services: b.services.filter((s) => s.is_active).sort((x, y) => x.sort_order - y.sort_order || x.name.localeCompare(y.name)),
      images: b.business_images.filter((i) => i.kind === "gallery" && !i.is_hidden).sort((x, y) => x.sort_order - y.sort_order),
    };
  }),
);

export async function getSimilarBusinesses(b: BusinessProfile, limit = 3) {
  const byCategory = await searchBusinesses({
    category: b.category?.slug,
    province: b.location?.province,
    pageSize: limit + 1,
  });
  let list = byCategory.results.filter((r) => r.id !== b.id);
  if (list.length < limit && b.category) {
    const wider = await searchBusinesses({ category: b.category.slug, pageSize: limit + 1 });
    for (const r of wider.results) if (r.id !== b.id && !list.some((x) => x.id === r.id)) list.push(r);
  }
  list = list.slice(0, limit);
  return list;
}

export const getAllBusinessSlugs = cache(async () =>
  safe("business_slugs", [] as { slug: string; updated_at: string }[], async () => {
    const out: { slug: string; updated_at: string }[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db()
        .from("businesses")
        .select("slug, updated_at")
        .eq("status", "approved")
        .is("deleted_at", null)
        .order("approved_at", { ascending: false })
        .range(from, from + 999);
      if (error) throw error;
      out.push(...((data as { slug: string; updated_at: string }[]) ?? []));
      if (!data || data.length < 1000 || out.length >= 45000) break;
    }
    return out;
  }),
);

/** Popular services = subcategories with the most active services offered by approved businesses. */
export const getPopularServices = cache(async (limit = 12) =>
  safe("popular_services", [] as { name: string; slug: string; category_slug: string; count: number }[], async () => {
    const { data, error } = await db()
      .from("services")
      .select("subcategory:subcategories!inner(name, slug, category:categories!inner(slug))")
      .not("subcategory_id", "is", null)
      .limit(2000);
    if (error) throw error;
    type Row = { subcategory: { name: string; slug: string; category: { slug: string } } };
    const counts = new Map<string, { name: string; slug: string; category_slug: string; count: number }>();
    for (const r of (data as unknown as Row[]) ?? []) {
      const k = r.subcategory.slug;
      const cur = counts.get(k) ?? { name: r.subcategory.name, slug: k, category_slug: r.subcategory.category.slug, count: 0 };
      cur.count++;
      counts.set(k, cur);
    }
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
  }),
);

export async function getServicesForSubcategory(subcategoryId: string, page = 1, pageSize = 24) {
  return safe("services_for_sub", { rows: [] as (Service & { business: Pick<Business, "name" | "slug" | "logo_path"> & { business_locations: { city: string; province: string }[] } })[], total: 0 }, async () => {
    const { data, error, count } = await db()
      .from("services")
      .select("*, business:businesses!inner(name, slug, logo_path, business_locations(city, province))", { count: "exact" })
      .eq("subcategory_id", subcategoryId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (error) throw error;
    return { rows: (data as never) ?? [], total: count ?? 0 };
  });
}

// ---------------------------------------------------------------------------
// CMS
// ---------------------------------------------------------------------------
const POST_LIST = "id, slug, title, excerpt, cover_image_url, cover_image_alt, author_name, published_at, reading_minutes, category_id, updated_at, blog_categories(slug, name)";

export const getBlogCategories = cache(async () =>
  safe("blog_categories", [] as { id: string; slug: string; name: string; description: string | null }[], async () => {
    const { data, error } = await db().from("blog_categories").select("id, slug, name, description").order("sort_order");
    if (error) throw error;
    return data ?? [];
  }),
);

export async function getBlogPosts(opts: { page?: number; pageSize?: number; categoryId?: string; excludeId?: string } = {}) {
  return safe("blog_posts", { posts: [] as BlogPost[], total: 0 }, async () => {
    const pageSize = opts.pageSize ?? 9;
    const page = Math.max(1, opts.page ?? 1);
    let q = db()
      .from("blog_posts")
      .select(POST_LIST, { count: "exact" })
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (opts.categoryId) q = q.eq("category_id", opts.categoryId);
    if (opts.excludeId) q = q.neq("id", opts.excludeId);
    const { data, error, count } = await q;
    if (error) throw error;
    return { posts: (data as unknown as BlogPost[]) ?? [], total: count ?? 0 };
  });
}

export const getBlogPost = cache(async (slug: string) =>
  safe("blog_post", null as BlogPost | null, async () => {
    const { data, error } = await db().from("blog_posts").select("*, blog_categories(slug, name)").eq("slug", slug).maybeSingle();
    if (error) throw error;
    return (data as BlogPost) ?? null;
  }),
);

export const getAllPostSlugs = cache(async () =>
  safe("post_slugs", [] as { slug: string; updated_at: string; cover_image_url: string | null; title: string }[], async () => {
    const { data, error } = await db().from("blog_posts").select("slug, updated_at, cover_image_url, title").lte("published_at", new Date().toISOString()).order("published_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  }),
);

export const getFaqs = cache(async (audience?: Faq["audience"]) =>
  safe("faqs", [] as Faq[], async () => {
    let q = db().from("faqs").select("*").eq("is_published", true).order("sort_order");
    if (audience) q = q.eq("audience", audience);
    const { data, error } = await q;
    if (error) throw error;
    return (data as Faq[]) ?? [];
  }),
);

export const getSitePage = cache(async (slug: string) =>
  safe("site_page", null as SitePage | null, async () => {
    const { data, error } = await db().from("site_pages").select("*").eq("slug", slug).eq("is_published", true).maybeSingle();
    if (error) throw error;
    return (data as SitePage) ?? null;
  }),
);

export const getSitePages = cache(async () =>
  safe("site_pages", [] as Pick<SitePage, "slug" | "title" | "updated_at" | "show_in_footer">[], async () => {
    const { data, error } = await db().from("site_pages").select("slug, title, updated_at, show_in_footer").eq("is_published", true);
    if (error) throw error;
    return data ?? [];
  }),
);

export type PlatformSettings = {
  site_name: string;
  contact_email: string;
  privacy_email: string;
  contact_phone: string;
  physical_address: string;
  social: { facebook?: string; instagram?: string; linkedin?: string; tiktok?: string; x?: string };
  registration_open: boolean;
  business_registration_open: boolean;
  seo_default_title: string;
  seo_default_description: string;
  ads_enabled: boolean;
  announcement: string;
};

const DEFAULT_SETTINGS: PlatformSettings = {
  site_name: "Findora",
  contact_email: "hello@findora.co.za",
  privacy_email: "privacy@findora.co.za",
  contact_phone: "",
  physical_address: "",
  social: {},
  registration_open: true,
  business_registration_open: true,
  seo_default_title: "Findora — Discover Businesses. Connect with Confidence.",
  seo_default_description:
    "Search South African businesses, explore services and contact trusted providers directly. Free listings for businesses.",
  ads_enabled: false,
  announcement: "",
};

export const getSettings = cache(async (): Promise<PlatformSettings> =>
  safe("settings", DEFAULT_SETTINGS, async () => {
    const { data, error } = await db().from("platform_settings").select("key, value");
    if (error) throw error;
    const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
    for (const r of data ?? []) out[r.key] = r.value;
    return out as PlatformSettings;
  }),
);

export const getActiveAd = cache(async (placement: string) =>
  safe("ad", null as { id: string; provider: "adsense" | "direct"; adsense_slot: string | null; image_url: string | null; link_url: string | null; alt_text: string | null; name: string } | null, async () => {
    const { data, error } = await db()
      .from("advertisements")
      .select("id, name, provider, adsense_slot, image_url, link_url, alt_text")
      .eq("placement", placement)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  }),
);
