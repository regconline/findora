import { z } from "zod";
import { PROVINCES } from "@/lib/constants";
import { normaliseSaPhone, normaliseUrl } from "@/lib/utils";
import type { ActionState } from "@/lib/types";

// ---------------------------------------------------------------------------
// Primitive helpers (form inputs arrive as strings)
// ---------------------------------------------------------------------------
const emptyToUndef = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const trimmed = (min: number, max: number, label: string) =>
  z
    .string({ message: `${label} is required` })
    .trim()
    .min(min, min <= 1 ? `${label} is required` : `${label} must be at least ${min} characters`)
    .max(max, `${label} must be ${max} characters or fewer`);
const optionalText = (max: number, label = "This field") =>
  z.preprocess(emptyToUndef, z.string().trim().max(max, `${label} must be ${max} characters or fewer`).optional());

export const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

export const email = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
  z.email("Enter a valid email address").max(254),
);

export const password = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(72, "Use 72 characters or fewer")
  .regex(/[a-z]/i, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

export const saPhone = z.preprocess(
  emptyToUndef,
  z
    .string()
    .transform((v, ctx) => {
      const n = normaliseSaPhone(v);
      if (!n) {
        ctx.addIssue({ code: "custom", message: "Enter a valid phone number, e.g. 082 123 4567" });
        return z.NEVER;
      }
      return n;
    })
    .optional(),
);

export const url = z.preprocess(
  emptyToUndef,
  z
    .string()
    .max(300)
    .transform((v, ctx) => {
      const n = normaliseUrl(v);
      if (!n) {
        ctx.addIssue({ code: "custom", message: "Enter a valid web address" });
        return z.NEVER;
      }
      return n;
    })
    .optional(),
);

const socialUrl = (hosts: string[], label: string) =>
  url.refine(
    (v) => !v || hosts.some((h) => new URL(v).hostname.replace(/^www\./, "").endsWith(h)),
    `Enter a valid ${label} link`,
  );

const uuid = z.uuid("Select a valid option");
const optionalUuid = z.preprocess(emptyToUndef, z.uuid().optional());

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
  next: z.string().optional(),
});

export const registerSchema = z
  .object({
    full_name: trimmed(2, 120, "Full name"),
    email,
    phone: saPhone,
    password,
    confirm_password: z.string(),
    account_type: z.enum(["customer", "business_owner"]),
    accept_terms: checkbox.refine((v) => v, "You must accept the terms and privacy policy"),
    marketing_opt_in: checkbox,
  })
  .refine((d) => d.password === d.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match",
  });

export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z
  .object({ password, confirm_password: z.string() })
  .refine((d) => d.password === d.confirm_password, { path: ["confirm_password"], message: "Passwords do not match" });

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------
export const profileSchema = z.object({
  full_name: trimmed(2, 120, "Full name"),
  phone: saPhone,
  city: optionalText(80, "City"),
  province: z.preprocess(emptyToUndef, z.enum(PROVINCES).optional()),
  bio: optionalText(500, "Bio"),
  profile_is_public: checkbox,
  marketing_opt_in: checkbox,
});

// ---------------------------------------------------------------------------
// Businesses
// ---------------------------------------------------------------------------
export const businessInfoSchema = z.object({
  name: trimmed(2, 120, "Business name"),
  tagline: optionalText(160, "Tagline"),
  description: trimmed(40, 5000, "Business description"),
  category_id: uuid,
  subcategory_id: optionalUuid,
  business_type: z.enum(["sole_proprietor", "private_company", "partnership", "non_profit", "freelancer", "franchise", "other"]),
  year_established: z.preprocess(
    emptyToUndef,
    z.coerce.number().int().min(1800, "Enter a valid year").max(new Date().getFullYear(), "Year cannot be in the future").optional(),
  ),
  registration_number: z.preprocess(
    emptyToUndef,
    z.string().trim().max(40).regex(/^[A-Za-z0-9/ -]+$/, "Use letters, numbers and slashes only").optional(),
  ),
  show_registration_number: checkbox,
  website: url,
});

const postalCode = z.preprocess(emptyToUndef, z.string().trim().regex(/^\d{4}$/, "Postal codes have 4 digits").optional());
const coordinate = (min: number, max: number) =>
  z.preprocess(emptyToUndef, z.coerce.number().min(min).max(max).optional());

export const locationSchema = z.object({
  province: z.enum(PROVINCES, { message: "Select a province" }),
  city: trimmed(2, 80, "City"),
  town: optionalText(80, "Town"),
  suburb: optionalText(80, "Suburb"),
  street_address: optionalText(200, "Street address"),
  show_street_address: checkbox,
  postal_code: postalCode,
  latitude: coordinate(-35.5, -21.5),
  longitude: coordinate(16, 33.5),
  service_areas: z.preprocess(
    (v) =>
      typeof v === "string"
        ? v
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 20)
        : [],
    z.array(z.string().max(60)),
  ),
});

export const contactSchema = z
  .object({
    phone: saPhone,
    whatsapp: saPhone,
    email: z.preprocess(emptyToUndef, email.optional()),
    website: url,
    facebook_url: socialUrl(["facebook.com", "fb.com"], "Facebook"),
    instagram_url: socialUrl(["instagram.com"], "Instagram"),
    tiktok_url: socialUrl(["tiktok.com"], "TikTok"),
    linkedin_url: socialUrl(["linkedin.com"], "LinkedIn"),
    contact_publish_consent: checkbox,
  })
  .refine((d) => d.phone || d.whatsapp || d.email, {
    path: ["phone"],
    message: "Add at least one way for customers to reach you (phone, WhatsApp or email)",
  })
  .refine((d) => d.contact_publish_consent, {
    path: ["contact_publish_consent"],
    message: "Please confirm you have permission to publish these contact details",
  });

const time = z.preprocess(emptyToUndef, z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM").optional());
export const hoursSchema = z.array(
  z
    .object({ day_of_week: z.number().int().min(0).max(6), is_closed: z.boolean(), opens_at: time, closes_at: time })
    .refine((h) => h.is_closed || (h.opens_at && h.closes_at), { message: "Enter opening and closing times or mark as closed" })
    .refine((h) => h.is_closed || !h.opens_at || !h.closes_at || h.opens_at < h.closes_at, {
      message: "Closing time must be after opening time",
    }),
);

export const serviceSchema = z
  .object({
    name: trimmed(2, 120, "Service name"),
    description: optionalText(2000, "Description"),
    subcategory_id: optionalUuid,
    price_type: z.enum(["fixed", "starting_from", "hourly", "quote", "free"]),
    price: z.preprocess(emptyToUndef, z.coerce.number().min(0, "Price cannot be negative").max(10_000_000).optional()),
    availability: optionalText(200, "Availability"),
  })
  .refine((s) => !["fixed", "hourly"].includes(s.price_type) || s.price !== undefined, {
    path: ["price"],
    message: "Enter a price for fixed or hourly services",
  })
  .transform((s) => ({ ...s, price: s.price_type === "free" || s.price_type === "quote" ? undefined : s.price }));

// ---------------------------------------------------------------------------
// Customer interactions
// ---------------------------------------------------------------------------
export const enquirySchema = z
  .object({
    business_id: uuid,
    service_id: optionalUuid,
    name: trimmed(2, 120, "Name"),
    email,
    phone: saPhone,
    subject: trimmed(2, 150, "Subject"),
    message: trimmed(10, 4000, "Message"),
    consent: checkbox.refine((v) => v, "Please agree so we can pass your enquiry to the business"),
    create_account: checkbox,
    password: z.preprocess(emptyToUndef, z.string().optional()),
    website_url: z.string().optional(), // honeypot — must stay empty
  })
  .superRefine((d, ctx) => {
    if (d.create_account) {
      const r = password.safeParse(d.password ?? "");
      if (!r.success) ctx.addIssue({ code: "custom", path: ["password"], message: r.error.issues[0]!.message });
    }
  });

export const reportSchema = z.object({
  business_id: uuid,
  image_id: optionalUuid,
  reason: z.enum(["suspicious", "incorrect_information", "inappropriate_photo", "spam", "other"], { message: "Choose a reason" }),
  details: trimmed(10, 2000, "Details"),
  reporter_email: z.preprocess(emptyToUndef, email.optional()),
  website_url: z.string().optional(),
});

export const contactFormSchema = z.object({
  name: trimmed(2, 120, "Name"),
  email,
  topic: z.enum(["general", "business", "privacy", "advertising", "report"]),
  message: trimmed(10, 4000, "Message"),
  website_url: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Admin / CMS
// ---------------------------------------------------------------------------
const slugField = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens")
  .max(90);

export const categorySchema = z.object({
  name: trimmed(2, 80, "Name"),
  slug: slugField,
  description: optionalText(400, "Description"),
  icon: z.preprocess(emptyToUndef, z.string().regex(/^[a-z0-9-]+$/).max(40).optional()),
  sort_order: z.coerce.number().int().min(0).max(100000).default(0),
  is_active: checkbox,
  seo_title: optionalText(70, "SEO title"),
  seo_description: optionalText(170, "SEO description"),
});

export const subcategorySchema = z.object({
  name: trimmed(2, 80, "Name"),
  slug: slugField,
  description: optionalText(400, "Description"),
  sort_order: z.coerce.number().int().min(0).max(100000).default(0),
  is_active: checkbox,
});

export const blogPostSchema = z.object({
  title: trimmed(5, 160, "Title"),
  slug: slugField,
  excerpt: trimmed(20, 320, "Excerpt"),
  content: trimmed(50, 100000, "Content"),
  category_id: optionalUuid,
  author_name: trimmed(2, 80, "Author"),
  cover_image_url: z.preprocess(emptyToUndef, z.string().url().max(500).optional()),
  cover_image_alt: optionalText(200, "Image alt text"),
  status: z.enum(["draft", "scheduled", "published", "archived"]),
  published_at: z.preprocess(emptyToUndef, z.string().optional()),
  seo_title: optionalText(70, "SEO title"),
  seo_description: optionalText(170, "SEO description"),
});

export const sitePageSchema = z.object({
  title: trimmed(2, 120, "Title"),
  slug: slugField,
  summary: optionalText(300, "Summary"),
  content: trimmed(10, 100000, "Content"),
  seo_title: optionalText(70, "SEO title"),
  seo_description: optionalText(170, "SEO description"),
  is_published: checkbox,
  show_in_footer: checkbox,
});

export const faqSchema = z.object({
  question: trimmed(5, 300, "Question"),
  answer: trimmed(5, 4000, "Answer"),
  audience: z.enum(["general", "customers", "businesses"]),
  sort_order: z.coerce.number().int().min(0).default(0),
  is_published: checkbox,
  show_on_home: checkbox,
});

export const adSchema = z
  .object({
    name: trimmed(2, 120, "Name"),
    placement: z.enum(["home_mid", "search_results", "category_page", "blog_article", "business_profile"]),
    provider: z.enum(["adsense", "direct"]),
    adsense_slot: z.preprocess(emptyToUndef, z.string().regex(/^\d{6,20}$/, "AdSense slot IDs are numeric").optional()),
    image_url: z.preprocess(emptyToUndef, z.string().url().optional()),
    link_url: url,
    alt_text: optionalText(200, "Alt text"),
    is_active: checkbox,
    starts_at: z.preprocess(emptyToUndef, z.string().optional()),
    ends_at: z.preprocess(emptyToUndef, z.string().optional()),
  })
  .refine((a) => a.provider !== "adsense" || a.adsense_slot, { path: ["adsense_slot"], message: "Enter the AdSense ad slot ID" })
  .refine((a) => a.provider !== "direct" || (a.image_url && a.link_url), {
    path: ["image_url"],
    message: "Direct campaigns need an image and a link",
  });

// ---------------------------------------------------------------------------
// FormData helper
// ---------------------------------------------------------------------------
export function formToObject(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string" && !k.startsWith("$ACTION")) out[k] = v;
  return out;
}

export type Parsed<T> = { success: true; data: T } | { success: false; state: ActionState };

export function parseForm<S extends z.ZodType>(schema: S, fd: FormData | Record<string, unknown>): Parsed<z.output<S>> {
  const raw = fd instanceof FormData ? formToObject(fd) : fd;
  const r = schema.safeParse(raw);
  if (r.success) return { success: true, data: r.data };
  const fieldErrors = z.flattenError(r.error).fieldErrors as Record<string, string[]>;
  const values = Object.fromEntries(
    Object.entries(raw).filter(([k, v]) => typeof v === "string" && !/password/i.test(k)),
  ) as Record<string, string>;
  return {
    success: false,
    state: { error: "Please correct the highlighted fields.", fieldErrors, values },
  };
}
