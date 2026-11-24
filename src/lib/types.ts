export type UserRole = "customer" | "business_owner" | "admin";
export type BusinessStatus = "draft" | "pending" | "approved" | "rejected" | "suspended";
export type PriceType = "fixed" | "starting_from" | "hourly" | "quote" | "free";

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_path: string | null;
  bio: string | null;
  city: string | null;
  province: string | null;
  role: UserRole;
  status: "active" | "suspended" | "deleted";
  profile_is_public: boolean;
  marketing_opt_in: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  sort_order: number;
  is_active: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
  subcategories?: Subcategory[];
}

export interface Subcategory {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface Business {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string;
  business_type: string;
  category_id: string | null;
  subcategory_id: string | null;
  year_established: number | null;
  registration_number: string | null;
  show_registration_number: boolean;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  linkedin_url: string | null;
  contact_publish_consent: boolean;
  logo_path: string | null;
  cover_path: string | null;
  status: BusinessStatus;
  rejection_reason: string | null;
  suspended_reason: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  is_verified: boolean;
  is_featured: boolean;
  featured_until: string | null;
  is_sponsored: boolean;
  plan: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface BusinessLocation {
  id: string;
  business_id: string;
  province: string;
  city: string;
  town: string | null;
  suburb: string | null;
  street_address: string | null;
  show_street_address: boolean;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  service_areas: string[];
}

export interface BusinessHour {
  id: string;
  business_id: string;
  day_of_week: number;
  is_closed: boolean;
  opens_at: string | null;
  closes_at: string | null;
  note: string | null;
}

export interface Service {
  id: string;
  business_id: string;
  subcategory_id: string | null;
  name: string;
  description: string | null;
  price: number | null;
  price_type: PriceType;
  availability: string | null;
  image_path: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface BusinessImage {
  id: string;
  business_id: string;
  kind: "gallery" | "service";
  bucket: string;
  storage_path: string;
  alt_text: string;
  width: number | null;
  height: number | null;
  sort_order: number;
  is_hidden: boolean;
}

export interface SearchResult {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string;
  logo_path: string | null;
  cover_path: string | null;
  category_name: string | null;
  category_slug: string | null;
  subcategory_name: string | null;
  subcategory_slug: string | null;
  province: string | null;
  city: string | null;
  suburb: string | null;
  is_verified: boolean;
  is_featured: boolean;
  approved_at: string | null;
  service_count: number;
  min_price: number | null;
  rank: number;
  total_count: number;
}

export interface Enquiry {
  id: string;
  business_id: string;
  customer_id: string | null;
  service_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: "new" | "read" | "archived";
  read_at: string | null;
  customer_archived: boolean;
  created_at: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  category_id: string | null;
  author_name: string;
  status: "draft" | "scheduled" | "published" | "archived";
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  reading_minutes: number;
  updated_at: string;
  created_at: string;
  blog_categories?: { slug: string; name: string } | null;
}

export interface SitePage {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  content: string;
  seo_title: string | null;
  seo_description: string | null;
  is_published: boolean;
  show_in_footer: boolean;
  updated_at: string;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  audience: "general" | "customers" | "businesses";
  sort_order: number;
  is_published: boolean;
  show_on_home: boolean;
}

export type ActionState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: Record<string, string>;
  redirectTo?: string;
};
