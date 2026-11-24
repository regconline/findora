import { describe, expect, it } from "vitest";
import {
  registerSchema, loginSchema, businessInfoSchema, locationSchema, contactSchema,
  serviceSchema, enquirySchema, reportSchema, hoursSchema, parseForm, adSchema,
} from "@/lib/validation";

const CAT = "3f1c3c2e-6a51-4d4e-9b8b-0d7e2a1b9c11";

describe("authentication validation", () => {
  const base = {
    full_name: "Thandi Mokoena", email: " Thandi@Example.co.za ", phone: "082 123 4567",
    password: "secure-pass-2026", confirm_password: "secure-pass-2026",
    account_type: "customer", accept_terms: "on",
  };
  it("accepts a valid registration and normalises email + phone", () => {
    const r = registerSchema.parse(base);
    expect(r.email).toBe("thandi@example.co.za");
    expect(r.phone).toBe("+27821234567");
    expect(r.accept_terms).toBe(true);
    expect(r.marketing_opt_in).toBe(false);
  });
  it("rejects weak passwords", () => {
    expect(registerSchema.safeParse({ ...base, password: "short", confirm_password: "short" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: "onlyletterslong", confirm_password: "onlyletterslong" }).success).toBe(false);
  });
  it("rejects mismatched passwords", () => {
    const r = parseForm(registerSchema, { ...base, confirm_password: "different-2026" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.state.fieldErrors?.confirm_password?.[0]).toMatch(/match/);
  });
  it("requires accepting terms", () => {
    const { accept_terms, ...rest } = base; void accept_terms;
    expect(registerSchema.safeParse(rest).success).toBe(false);
  });
  it("cannot register as admin", () => {
    expect(registerSchema.safeParse({ ...base, account_type: "admin" }).success).toBe(false);
  });
  it("never echoes passwords back in form values", () => {
    const r = parseForm(registerSchema, { ...base, email: "bad" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.state.values?.password).toBeUndefined();
      expect(r.state.values?.full_name).toBe("Thandi Mokoena");
    }
  });
  it("validates login", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
  });
});

describe("business profile validation", () => {
  const info = {
    name: "Klerksdorp Auto Clinic", description: "Family-owned workshop offering services, diagnostics and repairs for all makes.",
    category_id: CAT, business_type: "private_company",
  };
  it("accepts valid info and optional fields", () => {
    const r = businessInfoSchema.parse({ ...info, website: "autoclinic.co.za", year_established: "2009", subcategory_id: "" });
    expect(r.website).toBe("https://autoclinic.co.za/");
    expect(r.year_established).toBe(2009);
    expect(r.subcategory_id).toBeUndefined();
  });
  it("rejects short descriptions and future years", () => {
    expect(businessInfoSchema.safeParse({ ...info, description: "Too short" }).success).toBe(false);
    expect(businessInfoSchema.safeParse({ ...info, year_established: String(new Date().getFullYear() + 1) }).success).toBe(false);
  });
  it("rejects javascript: URLs", () => {
    expect(businessInfoSchema.safeParse({ ...info, website: "javascript:alert(1)" }).success).toBe(false);
  });
  it("validates locations with SA provinces and postal codes", () => {
    const r = locationSchema.parse({ province: "North West", city: "Wolmaransstad", postal_code: "2630", service_areas: "Klerksdorp, Bloemhof, " });
    expect(r.service_areas).toEqual(["Klerksdorp", "Bloemhof"]);
    expect(locationSchema.safeParse({ province: "Texas", city: "Austin" }).success).toBe(false);
    expect(locationSchema.safeParse({ province: "Gauteng", city: "Pretoria", postal_code: "12345" }).success).toBe(false);
    expect(locationSchema.safeParse({ province: "Gauteng", city: "Pretoria", latitude: "51.5" }).success).toBe(false);
  });
  it("requires at least one contact channel and publication consent", () => {
    expect(contactSchema.safeParse({ contact_publish_consent: "on" }).success).toBe(false);
    expect(contactSchema.safeParse({ phone: "0181234567" }).success).toBe(false);
    const ok = contactSchema.parse({ whatsapp: "+27 82 555 0000", contact_publish_consent: "on", instagram_url: "instagram.com/findora" });
    expect(ok.whatsapp).toBe("+27825550000");
  });
  it("rejects social links on the wrong network", () => {
    expect(contactSchema.safeParse({ phone: "0181234567", contact_publish_consent: "on", facebook_url: "https://evil.example.com" }).success).toBe(false);
  });
  it("validates opening hours", () => {
    expect(hoursSchema.safeParse([{ day_of_week: 0, is_closed: false, opens_at: "08:00", closes_at: "17:00" }]).success).toBe(true);
    expect(hoursSchema.safeParse([{ day_of_week: 0, is_closed: false, opens_at: "17:00", closes_at: "08:00" }]).success).toBe(false);
    expect(hoursSchema.safeParse([{ day_of_week: 6, is_closed: true }]).success).toBe(true);
  });
});

describe("service validation", () => {
  it("requires a price for fixed and hourly services", () => {
    expect(serviceSchema.safeParse({ name: "Wheel alignment", price_type: "fixed" }).success).toBe(false);
    expect(serviceSchema.parse({ name: "Wheel alignment", price_type: "fixed", price: "450" }).price).toBe(450);
  });
  it("drops prices for quotation and free services", () => {
    expect(serviceSchema.parse({ name: "Site inspection", price_type: "free", price: "100" }).price).toBeUndefined();
    expect(serviceSchema.parse({ name: "Roof repairs", price_type: "quote" }).price).toBeUndefined();
  });
  it("rejects negative prices", () => {
    expect(serviceSchema.safeParse({ name: "Wash", price_type: "starting_from", price: "-5" }).success).toBe(false);
  });
});

describe("enquiries and reports", () => {
  const e = { business_id: CAT, name: "Sipho", email: "sipho@example.com", subject: "Quote", message: "Please quote for a service.", consent: "on" };
  it("accepts a valid enquiry", () => expect(enquirySchema.safeParse(e).success).toBe(true));
  it("requires consent", () => expect(enquirySchema.safeParse({ ...e, consent: undefined }).success).toBe(false));
  it("requires a strong password when creating an account", () => {
    expect(enquirySchema.safeParse({ ...e, create_account: "on", password: "weak" }).success).toBe(false);
    expect(enquirySchema.safeParse({ ...e, create_account: "on", password: "strong-pass-99" }).success).toBe(true);
  });
  it("validates reports", () => {
    expect(reportSchema.safeParse({ business_id: CAT, reason: "spam", details: "Spam listing posting adverts" }).success).toBe(true);
    expect(reportSchema.safeParse({ business_id: CAT, reason: "nope", details: "Spam listing posting adverts" }).success).toBe(false);
  });
  it("validates ad configuration", () => {
    expect(adSchema.safeParse({ name: "Home", placement: "home_mid", provider: "adsense" }).success).toBe(false);
    expect(adSchema.safeParse({ name: "Home", placement: "home_mid", provider: "adsense", adsense_slot: "1234567890" }).success).toBe(true);
  });
});
