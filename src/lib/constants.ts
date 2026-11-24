export const SITE = {
  name: "Findora",
  tagline: "Discover Businesses. Connect with Confidence.",
  description:
    "Findora is South Africa's business discovery platform. Search local businesses, explore services and contact trusted service providers directly — free for customers and businesses.",
  locale: "en_ZA",
  country: "ZA",
};

export const PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
] as const;

export const BUSINESS_TYPES = [
  { value: "sole_proprietor", label: "Sole proprietor" },
  { value: "private_company", label: "Private company (Pty) Ltd" },
  { value: "partnership", label: "Partnership" },
  { value: "non_profit", label: "Non-profit / NPC" },
  { value: "freelancer", label: "Freelancer / independent professional" },
  { value: "franchise", label: "Franchise" },
  { value: "other", label: "Other" },
] as const;

export const PRICE_TYPES = [
  { value: "fixed", label: "Fixed price" },
  { value: "starting_from", label: "Starting from" },
  { value: "hourly", label: "Hourly rate" },
  { value: "quote", label: "Quotation required" },
  { value: "free", label: "Free" },
] as const;

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

export const REPORT_REASONS = [
  { value: "suspicious", label: "Suspicious or fraudulent business" },
  { value: "incorrect_information", label: "Incorrect information" },
  { value: "inappropriate_photo", label: "Inappropriate photograph" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Something else" },
] as const;

export const SORT_OPTIONS = [
  { value: "relevance", label: "Most relevant" },
  { value: "recent", label: "Recently added" },
  { value: "alphabetical", label: "Alphabetical (A–Z)" },
] as const;

export const BUCKETS = {
  logos: "business-logos",
  covers: "business-covers",
  gallery: "business-gallery",
  avatars: "avatars",
  site: "site-media",
} as const;

export const LIMITS = {
  maxUploadBytes: 4 * 1024 * 1024,
  galleryImagesFree: 12,
  servicesFree: 50,
  searchPageSize: 18,
};

export const AD_PLACEMENTS = [
  { value: "home_mid", label: "Homepage — between sections" },
  { value: "search_results", label: "Search results — after organic listings" },
  { value: "category_page", label: "Category pages — between sections" },
  { value: "blog_article", label: "Blog articles — within content" },
  { value: "business_profile", label: "Business profiles — below business information" },
] as const;

export const POLICY_VERSION = "2026-11";
