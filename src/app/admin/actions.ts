"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { audit, notify } from "@/lib/security";
import { emails, sendEmail } from "@/lib/email";
import { processImage, ImageValidationError } from "@/lib/images";
import { BUCKETS } from "@/lib/constants";
import { adSchema, blogPostSchema, categorySchema, faqSchema, parseForm, sitePageSchema, subcategorySchema } from "@/lib/validation";
import { readingMinutes } from "@/lib/utils";
import type { ActionState } from "@/lib/types";

async function ctx() {
  const { user, profile } = await requireAdmin();
  const supabase = await createClient(); // admin RLS policies apply (defence in depth)
  return { actor: { id: user.id, email: user.email }, profile, supabase };
}

function revalidatePublic() {
  revalidatePath("/", "layout");
}

async function ownerEmails(businessId: string) {
  const { data } = await createAdminClient().from("business_members").select("user_id, profiles(email, full_name)").eq("business_id", businessId);
  return ((data as unknown as { user_id: string; profiles: { email: string | null; full_name: string } | null }[]) ?? []).map((m) => ({ id: m.user_id, email: m.profiles?.email ?? null }));
}

// ---------------------------------------------------------------------------
// Business moderation
// ---------------------------------------------------------------------------
export async function moderateBusinessAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { actor, supabase } = await ctx();
  const decision = String(fd.get("decision"));
  const reason = String(fd.get("reason") ?? "").trim().slice(0, 1000);
  const { data: b } = await supabase.from("businesses").select("id, name, slug, status").eq("id", id).maybeSingle();
  if (!b) return { error: "Business not found." };
  const owners = await ownerEmails(id);
  const to = owners.map((o) => o.email).filter((e): e is string => Boolean(e));

  if (decision === "approve") {
    const { error } = await supabase.from("businesses").update({ status: "approved", approved_by: actor.id }).eq("id", id);
    if (error) return { error: error.message };
    if (to.length) await sendEmail({ to, ...emails.businessApproved(b.name, b.slug) });
    await notify(owners.map((o) => o.id), { type: "listing", title: `${b.name} is now live`, link: `/businesses/${b.slug}` });
  } else if (decision === "reject") {
    if (reason.length < 10) return { error: "Give the business a clear reason (at least 10 characters).", fieldErrors: { reason: ["Required"] } };
    const { error } = await supabase.from("businesses").update({ status: "rejected", rejection_reason: reason }).eq("id", id);
    if (error) return { error: error.message };
    if (to.length) await sendEmail({ to, ...emails.businessRejected(b.name, reason, id) });
    await notify(owners.map((o) => o.id), { type: "listing", title: `Changes needed: ${b.name}`, body: reason, link: `/dashboard/businesses/${id}` });
  } else if (decision === "suspend") {
    if (reason.length < 10) return { error: "Record a reason for the suspension.", fieldErrors: { reason: ["Required"] } };
    const { error } = await supabase.from("businesses").update({ status: "suspended", suspended_reason: reason }).eq("id", id);
    if (error) return { error: error.message };
    if (to.length) await sendEmail({ to, ...emails.businessSuspended(b.name, reason) });
    await notify(owners.map((o) => o.id), { type: "listing", title: `${b.name} has been suspended`, body: reason });
  } else if (decision === "restore") {
    const { error } = await supabase.from("businesses").update({ status: "approved", suspended_reason: null, deleted_at: null }).eq("id", id);
    if (error) return { error: error.message };
    await notify(owners.map((o) => o.id), { type: "listing", title: `${b.name} has been reinstated`, link: `/businesses/${b.slug}` });
  } else {
    return { error: "Unknown action." };
  }
  await audit(actor, `business.${decision}`, "business", id, { name: b.name, from: b.status, reason: reason || undefined });
  revalidatePublic();
  return { ok: true, message: `Listing ${decision === "approve" ? "approved" : decision === "reject" ? "rejected" : decision === "suspend" ? "suspended" : "restored"}.` };
}

export async function updateBusinessFlagsAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { actor, supabase } = await ctx();
  const featuredUntil = String(fd.get("featured_until") ?? "") || null;
  const patch = {
    is_verified: fd.get("is_verified") === "on",
    verification_notes: String(fd.get("verification_notes") ?? "").slice(0, 1000) || null,
    is_featured: fd.get("is_featured") === "on",
    featured_until: featuredUntil ? new Date(`${featuredUntil}T23:59:59+02:00`).toISOString() : null,
    is_sponsored: fd.get("is_sponsored") === "on",
    plan: (["free", "premium", "sponsored"].includes(String(fd.get("plan"))) ? String(fd.get("plan")) : "free") as string,
  };
  if (patch.is_verified && !patch.verification_notes) {
    return { error: "Record how the business was verified before marking it verified.", fieldErrors: { verification_notes: ["Required for verification"] } };
  }
  const { error } = await supabase.from("businesses").update(patch).eq("id", id);
  if (error) return { error: error.message };
  await audit(actor, "business.flags", "business", id, patch);
  revalidatePublic();
  return { ok: true, message: "Listing settings saved." };
}

export async function adminEditBusinessAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { actor, supabase } = await ctx();
  const name = String(fd.get("name") ?? "").trim();
  const description = String(fd.get("description") ?? "").trim();
  const slug = String(fd.get("slug") ?? "").trim().toLowerCase();
  if (name.length < 2 || description.length < 10) return { error: "Name and description are required." };
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return { error: "Invalid URL slug.", fieldErrors: { slug: ["Use lowercase letters, numbers and hyphens"] } };
  const { error } = await supabase.from("businesses").update({ name, description, slug }).eq("id", id);
  if (error) return { error: error.message.includes("duplicate") ? "That URL is already used by another business." : error.message };
  await audit(actor, "business.edit", "business", id, { name, slug });
  revalidatePublic();
  return { ok: true, message: "Business updated." };
}

export async function deleteBusinessPermanentlyAction(id: string) {
  const { actor, supabase } = await ctx();
  const admin = createAdminClient();
  const { data: b } = await supabase.from("businesses").select("name, logo_path, cover_path").eq("id", id).maybeSingle();
  const { data: imgs } = await supabase.from("business_images").select("bucket, storage_path").eq("business_id", id);
  const { data: svc } = await supabase.from("services").select("image_path").eq("business_id", id).not("image_path", "is", null);
  await supabase.from("businesses").delete().eq("id", id);
  if (b?.logo_path) await admin.storage.from(BUCKETS.logos).remove([b.logo_path]);
  if (b?.cover_path) await admin.storage.from(BUCKETS.covers).remove([b.cover_path]);
  const gallery = [...(imgs ?? []).map((i) => i.storage_path), ...(svc ?? []).map((s) => s.image_path as string)];
  if (gallery.length) await admin.storage.from(BUCKETS.gallery).remove(gallery);
  await audit(actor, "business.delete", "business", id, { name: b?.name });
  revalidatePublic();
  redirect("/admin/businesses?deleted=1");
}

export async function toggleImageHiddenAction(imageId: string, hidden: boolean, businessId: string) {
  const { actor, supabase } = await ctx();
  await supabase.from("business_images").update({ is_hidden: hidden }).eq("id", imageId);
  await audit(actor, hidden ? "image.hide" : "image.unhide", "business_image", imageId, { business_id: businessId });
  revalidatePublic();
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
export async function updateUserAction(userId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { actor, supabase } = await ctx();
  const role = String(fd.get("role"));
  const status = String(fd.get("status"));
  const reason = String(fd.get("reason") ?? "").trim().slice(0, 500);
  if (!["customer", "business_owner", "admin"].includes(role) || !["active", "suspended"].includes(status)) return { error: "Invalid values." };
  if (userId === actor.id && (role !== "admin" || status !== "active")) return { error: "You cannot remove your own administrator access or suspend yourself." };
  const { data: before } = await supabase.from("profiles").select("role, status, full_name, email").eq("id", userId).maybeSingle();
  if (!before) return { error: "User not found." };
  if (status === "suspended" && before.status !== "suspended" && reason.length < 5) return { error: "Record a reason for the suspension.", fieldErrors: { reason: ["Required"] } };

  const { error } = await supabase.from("profiles").update({ role, status }).eq("id", userId);
  if (error) return { error: error.message };
  // Block/unblock sign-in at the auth layer too
  const admin = createAdminClient();
  if (status !== before.status) {
    await admin.auth.admin.updateUserById(userId, { ban_duration: status === "suspended" ? "876000h" : "none" });
    if (status === "suspended" && before.email) await sendEmail({ to: before.email, ...emails.accountSuspended(before.full_name, reason) });
  }
  await audit(actor, "user.update", "profile", userId, { from: { role: before.role, status: before.status }, to: { role, status }, reason: reason || undefined });
  revalidatePath("/admin/users");
  return { ok: true, message: "User updated." };
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
export async function saveCategoryAction(id: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  const { actor, supabase } = await ctx();
  const parsed = parseForm(categorySchema, fd);
  if (!parsed.success) return parsed.state;
  const row = { ...parsed.data, icon: parsed.data.icon ?? "briefcase", description: parsed.data.description ?? null, seo_title: parsed.data.seo_title ?? null, seo_description: parsed.data.seo_description ?? null };
  const { data, error } = id
    ? await supabase.from("categories").update(row).eq("id", id).select("id").single()
    : await supabase.from("categories").insert(row).select("id").single();
  if (error) return { error: error.message.includes("duplicate") ? "That slug is already in use." : error.message };
  await audit(actor, id ? "category.update" : "category.create", "category", data.id, { name: row.name });
  revalidatePublic();
  if (!id) redirect(`/admin/categories/${data.id}`);
  return { ok: true, message: "Category saved." };
}

export async function moveCategoryAction(id: string, dir: "up" | "down") {
  const { supabase } = await ctx();
  const { data } = await supabase.from("categories").select("id, sort_order").order("sort_order").order("name");
  const list = data ?? [];
  const i = list.findIndex((c) => c.id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j]!, list[i]!];
  await Promise.all(list.map((c, idx) => supabase.from("categories").update({ sort_order: (idx + 1) * 10 }).eq("id", c.id)));
  revalidatePublic();
}

export async function deleteCategoryAction(id: string) {
  const { actor, supabase } = await ctx();
  const { count } = await supabase.from("businesses").select("id", { count: "exact", head: true }).eq("category_id", id);
  if (count) {
    await supabase.from("categories").update({ is_active: false }).eq("id", id);
    await audit(actor, "category.deactivate", "category", id, { reason: "in use", businesses: count });
  } else {
    await supabase.from("categories").delete().eq("id", id);
    await audit(actor, "category.delete", "category", id);
  }
  revalidatePublic();
  redirect("/admin/categories");
}

export async function saveSubcategoryAction(categoryId: string, id: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  const { actor, supabase } = await ctx();
  const parsed = parseForm(subcategorySchema, fd);
  if (!parsed.success) return parsed.state;
  const row = { ...parsed.data, description: parsed.data.description ?? null, category_id: categoryId };
  const { error } = id ? await supabase.from("subcategories").update(row).eq("id", id) : await supabase.from("subcategories").insert(row);
  if (error) return { error: error.message.includes("duplicate") ? "That slug is already used in this category." : error.message };
  await audit(actor, id ? "subcategory.update" : "subcategory.create", "subcategory", id, { name: row.name, category_id: categoryId });
  revalidatePublic();
  return { ok: true, message: id ? "Subcategory saved." : "Subcategory added." };
}

export async function deleteSubcategoryAction(id: string, categoryId: string) {
  const { actor, supabase } = await ctx();
  const { count } = await supabase.from("businesses").select("id", { count: "exact", head: true }).eq("subcategory_id", id);
  if (count) await supabase.from("subcategories").update({ is_active: false }).eq("id", id);
  else await supabase.from("subcategories").delete().eq("id", id);
  await audit(actor, count ? "subcategory.deactivate" : "subcategory.delete", "subcategory", id, { category_id: categoryId });
  revalidatePublic();
}

// ---------------------------------------------------------------------------
// CMS: blog, pages, FAQs
// ---------------------------------------------------------------------------
export async function saveBlogPostAction(id: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  const { actor, profile, supabase } = await ctx();
  const parsed = parseForm(blogPostSchema, fd);
  if (!parsed.success) return parsed.state;
  const d = parsed.data;
  // datetime-local values are entered in SAST (UTC+02:00)
  const sast = (v: string) => (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) ? `${v}:00+02:00` : v);
  let publishedAt = d.published_at ? new Date(sast(d.published_at)).toISOString() : null;
  if (d.status === "published" && !publishedAt) publishedAt = new Date().toISOString();
  if (d.status === "scheduled" && (!publishedAt || new Date(publishedAt) <= new Date())) {
    return { error: "Choose a future publication date to schedule this article.", fieldErrors: { published_at: ["Must be in the future"] } };
  }
  const row = {
    title: d.title, slug: d.slug, excerpt: d.excerpt, content: d.content, category_id: d.category_id ?? null,
    author_name: d.author_name, cover_image_url: d.cover_image_url ?? null, cover_image_alt: d.cover_image_alt ?? null,
    status: d.status, published_at: publishedAt, seo_title: d.seo_title ?? null,
    seo_description: d.seo_description ?? null, reading_minutes: readingMinutes(d.content), author_id: profile.id,
  };
  const { data, error } = id
    ? await supabase.from("blog_posts").update(row).eq("id", id).select("id").single()
    : await supabase.from("blog_posts").insert(row).select("id").single();
  if (error) return { error: error.message.includes("duplicate") ? "Another article already uses this slug." : error.message };
  await audit(actor, id ? "post.update" : "post.create", "blog_post", data.id, { title: d.title, status: d.status });
  revalidatePath("/blog", "layout");
  revalidatePath("/");
  if (!id) redirect(`/admin/blog/${data.id}?saved=1`);
  return { ok: true, message: d.status === "published" ? "Article published." : d.status === "scheduled" ? "Article scheduled." : "Draft saved." };
}

export async function deleteBlogPostAction(id: string) {
  const { actor, supabase } = await ctx();
  await supabase.from("blog_posts").delete().eq("id", id);
  await audit(actor, "post.delete", "blog_post", id);
  revalidatePath("/blog", "layout");
  redirect("/admin/blog");
}

export async function saveBlogCategoryAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { actor, supabase } = await ctx();
  const name = String(fd.get("name") ?? "").trim();
  const slug = String(fd.get("slug") ?? "").trim().toLowerCase();
  if (name.length < 2 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return { error: "Enter a name and a valid slug." };
  const { error } = await supabase.from("blog_categories").insert({ name, slug, description: String(fd.get("description") ?? "") || null });
  if (error) return { error: error.message };
  await audit(actor, "blog_category.create", "blog_category", slug, { name });
  revalidatePath("/blog", "layout");
  return { ok: true, message: "Category added." };
}

export async function uploadSiteImageAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { actor } = await ctx();
  const file = fd.get("file");
  if (!(file instanceof File) || !file.size) return { error: "Choose an image." };
  try {
    const img = await processImage(file, "article");
    const path = `articles/${img.filename}`;
    const supabase = await createClient();
    const { error } = await supabase.storage.from(BUCKETS.site).upload(path, img.buffer, { contentType: img.contentType, cacheControl: "31536000" });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from(BUCKETS.site).getPublicUrl(path);
    await audit(actor, "media.upload", "site_media", path);
    return { ok: true, message: `Uploaded. Image URL: ${data.publicUrl}` };
  } catch (e) {
    return { error: e instanceof ImageValidationError ? e.message : "Upload failed." };
  }
}

export async function saveSitePageAction(id: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  const { actor, profile, supabase } = await ctx();
  const parsed = parseForm(sitePageSchema, fd);
  if (!parsed.success) return parsed.state;
  const d = parsed.data;
  const row = { ...d, summary: d.summary ?? null, seo_title: d.seo_title ?? null, seo_description: d.seo_description ?? null, updated_by: profile.id };
  const { data, error } = id
    ? await supabase.from("site_pages").update(row).eq("id", id).select("id").single()
    : await supabase.from("site_pages").insert(row).select("id").single();
  if (error) return { error: error.message.includes("duplicate") ? "That slug is in use." : error.message };
  await audit(actor, id ? "page.update" : "page.create", "site_page", data.id, { slug: d.slug });
  revalidatePublic();
  if (!id) redirect(`/admin/pages/${data.id}`);
  return { ok: true, message: "Page saved." };
}

export async function saveFaqAction(id: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  const { actor, supabase } = await ctx();
  const parsed = parseForm(faqSchema, fd);
  if (!parsed.success) return parsed.state;
  const { error } = id ? await supabase.from("faqs").update(parsed.data).eq("id", id) : await supabase.from("faqs").insert(parsed.data);
  if (error) return { error: error.message };
  await audit(actor, id ? "faq.update" : "faq.create", "faq", id, { question: parsed.data.question });
  revalidatePublic();
  return { ok: true, message: "FAQ saved." };
}

export async function deleteFaqAction(id: string) {
  const { actor, supabase } = await ctx();
  await supabase.from("faqs").delete().eq("id", id);
  await audit(actor, "faq.delete", "faq", id);
  revalidatePublic();
}

// ---------------------------------------------------------------------------
// Reports & messages
// ---------------------------------------------------------------------------
export async function updateReportAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { actor, supabase } = await ctx();
  const status = String(fd.get("status"));
  if (!["open", "reviewing", "resolved", "dismissed"].includes(status)) return { error: "Invalid status." };
  const notes = String(fd.get("admin_notes") ?? "").slice(0, 2000) || null;
  const done = status === "resolved" || status === "dismissed";
  const { error } = await supabase.from("business_reports").update({ status, admin_notes: notes, resolved_by: done ? actor.id : null, resolved_at: done ? new Date().toISOString() : null }).eq("id", id);
  if (error) return { error: error.message };
  await audit(actor, "report.update", "business_report", id, { status });
  revalidatePath("/admin/reports");
  return { ok: true, message: "Report updated." };
}

export async function markMessageHandledAction(id: string) {
  const { actor, supabase } = await ctx();
  await supabase.from("contact_messages").update({ status: "handled", handled_by: actor.id }).eq("id", id);
  await audit(actor, "contact_message.handled", "contact_message", id);
  revalidatePath("/admin/messages");
}

// ---------------------------------------------------------------------------
// Advertising & settings
// ---------------------------------------------------------------------------
export async function saveAdAction(id: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  const { actor, supabase } = await ctx();
  const parsed = parseForm(adSchema, fd);
  if (!parsed.success) return parsed.state;
  const d = parsed.data;
  const row = {
    ...d, adsense_slot: d.adsense_slot ?? null, image_url: d.image_url ?? null, link_url: d.link_url ?? null, alt_text: d.alt_text ?? null,
    starts_at: d.starts_at ? new Date(`${d.starts_at}T00:00:00+02:00`).toISOString() : null,
    ends_at: d.ends_at ? new Date(`${d.ends_at}T23:59:59+02:00`).toISOString() : null,
  };
  if (row.is_active) {
    // one active advertisement per placement
    await supabase.from("advertisements").update({ is_active: false }).eq("placement", row.placement).neq("id", id ?? "00000000-0000-0000-0000-000000000000");
  }
  const { error } = id ? await supabase.from("advertisements").update(row).eq("id", id) : await supabase.from("advertisements").insert(row);
  if (error) return { error: error.message };
  await audit(actor, id ? "ad.update" : "ad.create", "advertisement", id, { placement: row.placement, active: row.is_active });
  revalidatePublic();
  return { ok: true, message: "Advertisement saved." };
}

export async function deleteAdAction(id: string) {
  const { actor, supabase } = await ctx();
  await supabase.from("advertisements").delete().eq("id", id);
  await audit(actor, "ad.delete", "advertisement", id);
  revalidatePublic();
}

export async function saveSettingsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { actor, profile, supabase } = await ctx();
  const s = (k: string, max = 300) => String(fd.get(k) ?? "").trim().slice(0, max);
  const email = (k: string) => {
    const v = s(k);
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null;
  };
  const url = (k: string) => {
    const v = s(k);
    return /^https:\/\/[^\s]+$/.test(v) ? v : "";
  };
  if (!email("contact_email") || !email("privacy_email")) return { error: "Enter valid contact and privacy email addresses." };
  const values: Record<string, unknown> = {
    site_name: s("site_name", 60) || "Findora",
    contact_email: email("contact_email"),
    privacy_email: email("privacy_email"),
    contact_phone: s("contact_phone", 30),
    physical_address: s("physical_address", 300),
    social: { facebook: url("facebook"), instagram: url("instagram"), linkedin: url("linkedin"), tiktok: url("tiktok") },
    registration_open: fd.get("registration_open") === "on",
    business_registration_open: fd.get("business_registration_open") === "on",
    seo_default_title: s("seo_default_title", 70),
    seo_default_description: s("seo_default_description", 170),
    ads_enabled: fd.get("ads_enabled") === "on",
    announcement: s("announcement", 200),
  };
  const rows = Object.entries(values).map(([key, value]) => ({ key, value, is_public: true, updated_by: profile.id }));
  const { error } = await supabase.from("platform_settings").upsert(rows, { onConflict: "key" });
  if (error) return { error: error.message };
  await audit(actor, "settings.update", "platform_settings", null, { ads_enabled: values.ads_enabled, registration_open: values.registration_open });
  revalidatePublic();
  return { ok: true, message: "Settings saved." };
}
