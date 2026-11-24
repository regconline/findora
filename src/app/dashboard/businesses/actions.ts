"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { requireManagedBusiness, requireUser } from "@/lib/auth";
import {
  businessInfoSchema, contactSchema, hoursSchema, locationSchema, parseForm, serviceSchema,
} from "@/lib/validation";
import { processImage, ImageValidationError, type ImagePreset } from "@/lib/images";
import { BUCKETS, LIMITS } from "@/lib/constants";
import { emails, sendEmail } from "@/lib/email";
import { serverEnv } from "@/lib/env";
import { rateLimit } from "@/lib/security";
import type { ActionState, Business } from "@/lib/types";
import { slugify } from "@/lib/utils";

const step = (id: string, s: string) => `/dashboard/businesses/${id}/setup/${s}`;
const nextFrom = (fd: FormData, fallback: string) => {
  const n = fd.get("_next");
  return typeof n === "string" && n.startsWith("/dashboard/") ? n : fallback;
};

function refreshPublic(b: Pick<Business, "id" | "slug" | "status">) {
  revalidatePath(`/dashboard/businesses/${b.id}`, "layout");
  if (b.status === "approved") {
    revalidatePath(`/businesses/${b.slug}`);
    revalidatePath("/businesses");
    revalidatePath("/");
  }
}

// ---------------------------------------------------------------------------
// Step 2 — create / update business information
// ---------------------------------------------------------------------------
export async function createBusinessAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, profile } = await requireUser("/dashboard/businesses/new");
  const parsed = parseForm(businessInfoSchema, fd);
  if (!parsed.success) return parsed.state;
  if (!(await rateLimit("create-business", 10, 3600))) return { error: "You've created several listings recently. Please try again later." };

  const supabase = await createClient();
  if (profile.role === "customer") {
    await supabase.from("profiles").update({ role: "business_owner" }).eq("id", user.id);
  }
  const { data: slug } = await supabase.rpc("unique_business_slug", { p_base: parsed.data.name });
  const d = parsed.data;
  const { data, error } = await supabase
    .from("businesses")
    .insert({
      slug,
      name: d.name,
      tagline: d.tagline ?? null,
      description: d.description,
      category_id: d.category_id,
      subcategory_id: d.subcategory_id ?? null,
      business_type: d.business_type,
      year_established: d.year_established ?? null,
      registration_number: d.registration_number ?? null,
      show_registration_number: d.show_registration_number,
      website: d.website ?? null,
      created_by: user.id,
      status: "draft",
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[createBusiness]", error);
    return { error: "We couldn't save your business. Please try again." };
  }
  redirect(step(data.id, "location"));
}

export async function updateBusinessInfoAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { business, supabase } = await requireManagedBusiness(id);
  const parsed = parseForm(businessInfoSchema, fd);
  if (!parsed.success) return parsed.state;
  const d = parsed.data;
  const { error } = await supabase
    .from("businesses")
    .update({
      name: d.name,
      tagline: d.tagline ?? null,
      description: d.description,
      category_id: d.category_id,
      subcategory_id: d.subcategory_id ?? null,
      business_type: d.business_type,
      year_established: d.year_established ?? null,
      registration_number: d.registration_number ?? null,
      show_registration_number: d.show_registration_number,
      website: d.website ?? null,
    })
    .eq("id", id);
  if (error) return { error: "Could not save changes. Please try again." };
  refreshPublic(business);
  if (fd.get("_mode") === "wizard") redirect(step(id, "location"));
  return { ok: true, message: "Business details saved." };
}

// ---------------------------------------------------------------------------
// Step 3 — location
// ---------------------------------------------------------------------------
export async function saveLocationAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { business, supabase } = await requireManagedBusiness(id);
  const parsed = parseForm(locationSchema, fd);
  if (!parsed.success) return parsed.state;
  const d = parsed.data;
  const row = {
    business_id: id,
    is_primary: true,
    province: d.province,
    city: d.city,
    town: d.town ?? null,
    suburb: d.suburb ?? null,
    street_address: d.street_address ?? null,
    show_street_address: d.show_street_address,
    postal_code: d.postal_code ?? null,
    latitude: d.latitude ?? null,
    longitude: d.longitude ?? null,
    service_areas: d.service_areas,
  };
  const { data: existing } = await supabase.from("business_locations").select("id").eq("business_id", id).eq("is_primary", true).maybeSingle();
  const { error } = existing
    ? await supabase.from("business_locations").update(row).eq("id", existing.id)
    : await supabase.from("business_locations").insert(row);
  if (error) return { error: "Could not save the location. Please try again." };

  // SEO-friendly slug (business-name-city) for listings that have never been published.
  if (!business.approved_at && serverEnv().serviceRoleKey) {
    const base = slugify(`${business.name} ${d.city}`);
    if (base && !new RegExp(`^${base}(-\\d+)?$`).test(business.slug)) {
      const admin = createAdminClient();
      const { data: slug } = await admin.rpc("unique_business_slug", { p_base: base });
      if (slug) await admin.from("businesses").update({ slug }).eq("id", id);
    }
  }
  refreshPublic(business);
  if (fd.get("_mode") === "wizard") redirect(step(id, "contact"));
  return { ok: true, message: "Location saved." };
}

// ---------------------------------------------------------------------------
// Step 4 — contact details + operating hours
// ---------------------------------------------------------------------------
export async function saveContactAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { business, supabase, user } = await requireManagedBusiness(id);
  const parsed = parseForm(contactSchema, fd);
  if (!parsed.success) return parsed.state;

  const hoursRaw = Array.from({ length: 7 }, (_, day) => ({
    day_of_week: day,
    is_closed: fd.get(`closed_${day}`) === "on",
    opens_at: String(fd.get(`opens_${day}`) ?? ""),
    closes_at: String(fd.get(`closes_${day}`) ?? ""),
  }));
  const anyHours = hoursRaw.some((h) => h.is_closed || h.opens_at || h.closes_at);
  const hours = hoursSchema.safeParse(hoursRaw.filter((h) => h.is_closed || h.opens_at || h.closes_at));
  if (anyHours && !hours.success) {
    const day = hours.error.issues[0]?.path[0];
    void day;
    return { error: `Check the operating hours: ${hours.error.issues[0]?.message}`, values: Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string> };
  }

  const d = parsed.data;
  const { error } = await supabase
    .from("businesses")
    .update({
      phone: d.phone ?? null,
      whatsapp: d.whatsapp ?? null,
      email: d.email ?? null,
      website: d.website ?? null,
      facebook_url: d.facebook_url ?? null,
      instagram_url: d.instagram_url ?? null,
      tiktok_url: d.tiktok_url ?? null,
      linkedin_url: d.linkedin_url ?? null,
      contact_publish_consent: d.contact_publish_consent,
    })
    .eq("id", id);
  if (error) return { error: "Could not save contact details." };

  await supabase.from("business_hours").delete().eq("business_id", id);
  if (anyHours && hours.success && hours.data.length) {
    const { error: hErr } = await supabase.from("business_hours").insert(
      hours.data.map((h) => ({ business_id: id, day_of_week: h.day_of_week, is_closed: h.is_closed, opens_at: h.is_closed ? null : h.opens_at, closes_at: h.is_closed ? null : h.closes_at })),
    );
    if (hErr) return { error: "Contact details saved, but operating hours could not be saved." };
  }
  await supabase.from("consent_records").insert({ user_id: user.id, consent_type: "contact_publication", granted: true, context: `business:${id}` });
  refreshPublic(business);
  if (fd.get("_mode") === "wizard") redirect(step(id, "branding"));
  return { ok: true, message: "Contact details and hours saved." };
}

// ---------------------------------------------------------------------------
// Step 5 — branding & photographs
// ---------------------------------------------------------------------------
async function uploadTo(bucket: string, businessId: string, file: File, preset: ImagePreset) {
  const img = await processImage(file, preset);
  const path = `${businessId}/${img.filename}`;
  const supabase = await createClient(); // user-scoped: storage RLS re-checks ownership
  const { error } = await supabase.storage.from(bucket).upload(path, img.buffer, { contentType: img.contentType, upsert: false, cacheControl: "31536000" });
  if (error) throw new Error(error.message);
  return { path, width: img.width, height: img.height };
}

async function removeFrom(bucket: string, path: string | null) {
  if (!path) return;
  const supabase = await createClient();
  await supabase.storage.from(bucket).remove([path]);
}

export async function uploadBrandImageAction(id: string, kind: "logo" | "cover", _: ActionState, fd: FormData): Promise<ActionState> {
  const { business, supabase } = await requireManagedBusiness(id);
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image to upload." };
  if (!(await rateLimit("upload", 60, 3600))) return { error: "Upload limit reached. Please try again later." };
  try {
    const bucket = kind === "logo" ? BUCKETS.logos : BUCKETS.covers;
    const up = await uploadTo(bucket, id, file, kind);
    const col = kind === "logo" ? "logo_path" : "cover_path";
    const old = business[col];
    const { error } = await supabase.from("businesses").update({ [col]: up.path }).eq("id", id);
    if (error) throw new Error(error.message);
    await removeFrom(bucket, old);
    refreshPublic(business);
    revalidatePath(`/dashboard/businesses/${id}`, "layout");
    return { ok: true, message: kind === "logo" ? "Logo updated." : "Cover photo updated." };
  } catch (e) {
    if (e instanceof ImageValidationError) return { error: e.message };
    console.error("[upload]", e);
    return { error: "Upload failed. Please try again." };
  }
}

export async function removeBrandImageAction(id: string, kind: "logo" | "cover") {
  const { business, supabase } = await requireManagedBusiness(id);
  const col = kind === "logo" ? "logo_path" : "cover_path";
  await removeFrom(kind === "logo" ? BUCKETS.logos : BUCKETS.covers, business[col]);
  await supabase.from("businesses").update({ [col]: null }).eq("id", id);
  refreshPublic(business);
  revalidatePath(`/dashboard/businesses/${id}`, "layout");
}

export async function uploadGalleryAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { business, supabase } = await requireManagedBusiness(id);
  const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { error: "Choose at least one photo." };
  const { count } = await supabase.from("business_images").select("id", { count: "exact", head: true }).eq("business_id", id).eq("kind", "gallery");
  const remaining = LIMITS.galleryImagesFree - (count ?? 0);
  if (remaining <= 0) return { error: `You can upload up to ${LIMITS.galleryImagesFree} gallery photos. Delete a photo to add another.` };
  if (!(await rateLimit("upload", 60, 3600))) return { error: "Upload limit reached. Please try again later." };

  const errors: string[] = [];
  let added = 0;
  for (const [i, file] of files.slice(0, remaining).entries()) {
    try {
      const up = await uploadTo(BUCKETS.gallery, id, file, "gallery");
      const alt = `${business.name} photo ${(count ?? 0) + i + 1}`;
      const { error } = await supabase.from("business_images").insert({
        business_id: id, kind: "gallery", bucket: BUCKETS.gallery, storage_path: up.path, alt_text: alt,
        width: up.width, height: up.height, sort_order: (count ?? 0) + i,
      });
      if (error) throw new Error(error.message);
      added++;
    } catch (e) {
      errors.push(`${file.name}: ${e instanceof ImageValidationError ? e.message : "upload failed"}`);
    }
  }
  refreshPublic(business);
  revalidatePath(`/dashboard/businesses/${id}`, "layout");
  if (files.length > remaining) errors.push(`Only ${remaining} more photo(s) allowed.`);
  if (errors.length) return { ok: added > 0, error: errors.join(" "), message: added ? `${added} photo(s) uploaded.` : undefined };
  return { ok: true, message: `${added} photo${added === 1 ? "" : "s"} uploaded.` };
}

export async function deleteGalleryImageAction(id: string, imageId: string) {
  const { business, supabase } = await requireManagedBusiness(id);
  const { data: img } = await supabase.from("business_images").select("storage_path, bucket").eq("id", imageId).eq("business_id", id).maybeSingle();
  if (!img) return;
  await supabase.from("business_images").delete().eq("id", imageId).eq("business_id", id);
  await removeFrom(img.bucket, img.storage_path);
  refreshPublic(business);
  revalidatePath(`/dashboard/businesses/${id}`, "layout");
}

export async function moveGalleryImageAction(id: string, imageId: string, direction: "up" | "down") {
  const { business, supabase } = await requireManagedBusiness(id);
  const { data } = await supabase.from("business_images").select("id, sort_order").eq("business_id", id).eq("kind", "gallery").order("sort_order").order("created_at");
  const list = data ?? [];
  const i = list.findIndex((x) => x.id === imageId);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j]!, list[i]!];
  await Promise.all(list.map((x, idx) => supabase.from("business_images").update({ sort_order: idx }).eq("id", x.id)));
  refreshPublic(business);
  revalidatePath(`/dashboard/businesses/${id}`, "layout");
}

export async function updateAltTextAction(id: string, imageId: string, fd: FormData) {
  const { business, supabase } = await requireManagedBusiness(id);
  const alt = String(fd.get("alt_text") ?? "").trim().slice(0, 200);
  await supabase.from("business_images").update({ alt_text: alt }).eq("id", imageId).eq("business_id", id);
  refreshPublic(business);
  revalidatePath(`/dashboard/businesses/${id}`, "layout");
}

// ---------------------------------------------------------------------------
// Step 6 — services
// ---------------------------------------------------------------------------
export async function saveServiceAction(id: string, serviceId: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  const { business, supabase } = await requireManagedBusiness(id);
  const parsed = parseForm(serviceSchema, fd);
  if (!parsed.success) return parsed.state;
  const d = parsed.data;
  const row = {
    name: d.name,
    description: d.description ?? null,
    subcategory_id: d.subcategory_id ?? null,
    price_type: d.price_type,
    price: d.price ?? null,
    availability: d.availability ?? null,
  };

  let image_path: string | undefined;
  const file = fd.get("image");
  if (file instanceof File && file.size > 0) {
    try {
      image_path = (await uploadTo(BUCKETS.gallery, id, file, "service")).path;
    } catch (e) {
      return { error: e instanceof ImageValidationError ? e.message : "Image upload failed." };
    }
  }

  if (serviceId) {
    const { data: old } = await supabase.from("services").select("image_path").eq("id", serviceId).eq("business_id", id).maybeSingle();
    if (!old) return { error: "Service not found." };
    const { error } = await supabase.from("services").update({ ...row, ...(image_path ? { image_path } : {}) }).eq("id", serviceId).eq("business_id", id);
    if (error) return { error: "Could not save the service." };
    if (image_path && old.image_path) await removeFrom(BUCKETS.gallery, old.image_path);
  } else {
    const { count } = await supabase.from("services").select("id", { count: "exact", head: true }).eq("business_id", id);
    if ((count ?? 0) >= LIMITS.servicesFree) return { error: `You can list up to ${LIMITS.servicesFree} services.` };
    const { error } = await supabase.from("services").insert({ ...row, business_id: id, image_path: image_path ?? null, sort_order: count ?? 0 });
    if (error) return { error: "Could not add the service." };
  }
  refreshPublic(business);
  revalidatePath(`/dashboard/businesses/${id}`, "layout");
  return { ok: true, message: serviceId ? "Service updated." : "Service added.", redirectTo: nextFrom(fd, "") || undefined };
}

export async function deleteServiceAction(id: string, serviceId: string) {
  const { business, supabase } = await requireManagedBusiness(id);
  const { data } = await supabase.from("services").select("image_path").eq("id", serviceId).eq("business_id", id).maybeSingle();
  await supabase.from("services").delete().eq("id", serviceId).eq("business_id", id);
  if (data?.image_path) await removeFrom(BUCKETS.gallery, data.image_path);
  refreshPublic(business);
  revalidatePath(`/dashboard/businesses/${id}`, "layout");
}

export async function toggleServiceAction(id: string, serviceId: string, active: boolean) {
  const { business, supabase } = await requireManagedBusiness(id);
  await supabase.from("services").update({ is_active: active }).eq("id", serviceId).eq("business_id", id);
  refreshPublic(business);
  revalidatePath(`/dashboard/businesses/${id}`, "layout");
}

export async function moveServiceAction(id: string, serviceId: string, direction: "up" | "down") {
  const { business, supabase } = await requireManagedBusiness(id);
  const { data } = await supabase.from("services").select("id").eq("business_id", id).order("sort_order").order("created_at");
  const list = data ?? [];
  const i = list.findIndex((x) => x.id === serviceId);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j]!, list[i]!];
  await Promise.all(list.map((x, idx) => supabase.from("services").update({ sort_order: idx }).eq("id", x.id)));
  refreshPublic(business);
  revalidatePath(`/dashboard/businesses/${id}`, "layout");
}

// ---------------------------------------------------------------------------
// Steps 7–8 — completeness, submission, publication controls
// ---------------------------------------------------------------------------
export type Completeness = { key: string; label: string; done: boolean; required: boolean; href: string }[];

export async function getCompleteness(id: string): Promise<Completeness> {
  const supabase = await createClient();
  const [{ data: b }, { count: loc }, { count: svc }, { count: imgs }, { count: hrs }] = await Promise.all([
    supabase.from("businesses").select("description, category_id, phone, whatsapp, email, contact_publish_consent, logo_path, cover_path").eq("id", id).single(),
    supabase.from("business_locations").select("id", { count: "exact", head: true }).eq("business_id", id),
    supabase.from("services").select("id", { count: "exact", head: true }).eq("business_id", id).eq("is_active", true),
    supabase.from("business_images").select("id", { count: "exact", head: true }).eq("business_id", id),
    supabase.from("business_hours").select("id", { count: "exact", head: true }).eq("business_id", id),
  ]);
  return [
    { key: "business", label: "Business details and category", done: Boolean(b?.description && b.description.length >= 40 && b.category_id), required: true, href: step(id, "business") },
    { key: "location", label: "Location", done: (loc ?? 0) > 0, required: true, href: step(id, "location") },
    { key: "contact", label: "Contact details (with publishing permission)", done: Boolean((b?.phone || b?.whatsapp || b?.email) && b?.contact_publish_consent), required: true, href: step(id, "contact") },
    { key: "services", label: "At least one service", done: (svc ?? 0) > 0, required: true, href: step(id, "services") },
    { key: "logo", label: "Logo", done: Boolean(b?.logo_path), required: false, href: step(id, "branding") },
    { key: "cover", label: "Cover photo", done: Boolean(b?.cover_path), required: false, href: step(id, "branding") },
    { key: "gallery", label: "Gallery photos", done: (imgs ?? 0) > 0, required: false, href: step(id, "branding") },
    { key: "hours", label: "Operating hours", done: (hrs ?? 0) > 0, required: false, href: step(id, "contact") },
  ];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function submitForReviewAction(id: string, _state: ActionState, _fd: FormData): Promise<ActionState> {
  const { business, supabase, profile, user } = await requireManagedBusiness(id);
  if (business.status === "suspended") return { error: "Suspended listings cannot be resubmitted. Please contact us." };
  if (business.status === "pending") return { ok: true, message: "Your listing is already awaiting review." };
  const missing = (await getCompleteness(id)).filter((c) => c.required && !c.done);
  if (missing.length) return { error: `Complete these before submitting: ${missing.map((m) => m.label.toLowerCase()).join(", ")}.` };

  const { error } = await supabase.from("businesses").update({ status: "pending" }).eq("id", id);
  if (error) return { error: "Could not submit your listing. Please try again." };

  if (serverEnv().serviceRoleKey) {
    await createAdminClient().from("platform_events").insert({ event_type: "business_submitted", ref_id: id });
  }
  if (user.email) await sendEmail({ to: user.email, ...emails.businessSubmitted(profile.full_name, business.name) });
  const adminEmail = serverEnv().adminNotifyEmail;
  if (adminEmail) await sendEmail({ to: adminEmail, ...emails.adminNewListing(business.name, id) });
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/businesses/${id}?submitted=1`);
}

export async function unpublishAction(id: string) {
  const { business, supabase } = await requireManagedBusiness(id);
  await supabase.from("businesses").update({ status: "draft" }).eq("id", id);
  refreshPublic({ ...business, status: "approved" });
  revalidatePath("/dashboard", "layout");
}

export async function deleteBusinessAction(id: string) {
  const { business, supabase } = await requireManagedBusiness(id);
  await supabase.from("businesses").update({ deleted_at: new Date().toISOString(), status: "draft" }).eq("id", id);
  refreshPublic({ ...business, status: "approved" });
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/businesses?deleted=1");
}
