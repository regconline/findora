"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { parseForm, profileSchema, password as passwordSchema } from "@/lib/validation";
import { processImage, ImageValidationError } from "@/lib/images";
import { BUCKETS } from "@/lib/constants";
import { emails, sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/security";
import type { ActionState } from "@/lib/types";

export async function updateProfileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, profile } = await requireUser("/dashboard/settings");
  const parsed = parseForm(profileSchema, fd);
  if (!parsed.success) return parsed.state;
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: d.full_name,
      phone: d.phone ?? null,
      city: d.city ?? null,
      province: d.province ?? null,
      bio: d.bio ?? null,
      profile_is_public: d.profile_is_public,
      marketing_opt_in: d.marketing_opt_in,
    })
    .eq("id", user.id);
  if (error) return { error: "Could not save your profile." };
  if (d.marketing_opt_in !== profile.marketing_opt_in) {
    await supabase.from("consent_records").insert({ user_id: user.id, consent_type: "marketing", granted: d.marketing_opt_in, context: "account settings" });
  }
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Profile saved." };
}

export async function uploadAvatarAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, profile } = await requireUser("/dashboard/settings");
  const file = fd.get("file");
  if (!(file instanceof File) || !file.size) return { error: "Choose a photo." };
  if (!(await rateLimit("upload", 60, 3600))) return { error: "Upload limit reached. Try again later." };
  try {
    const img = await processImage(file, "avatar");
    const path = `${user.id}/${img.filename}`;
    const supabase = await createClient();
    const { error } = await supabase.storage.from(BUCKETS.avatars).upload(path, img.buffer, { contentType: img.contentType, cacheControl: "31536000" });
    if (error) throw new Error(error.message);
    await supabase.from("profiles").update({ avatar_path: path }).eq("id", user.id);
    if (profile.avatar_path) await supabase.storage.from(BUCKETS.avatars).remove([profile.avatar_path]);
    revalidatePath("/dashboard", "layout");
    return { ok: true, message: "Profile photo updated." };
  } catch (e) {
    if (e instanceof ImageValidationError) return { error: e.message };
    console.error("[avatar]", e);
    return { error: "Upload failed. Please try again." };
  }
}

export async function removeAvatarAction() {
  const { user, profile } = await requireUser("/dashboard/settings");
  const supabase = await createClient();
  if (profile.avatar_path) await supabase.storage.from(BUCKETS.avatars).remove([profile.avatar_path]);
  await supabase.from("profiles").update({ avatar_path: null }).eq("id", user.id);
  revalidatePath("/dashboard", "layout");
}

export async function changePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireUser("/dashboard/settings");
  const current = String(fd.get("current_password") ?? "");
  const next = passwordSchema.safeParse(String(fd.get("new_password") ?? ""));
  if (!next.success) return { error: "Please correct the highlighted fields.", fieldErrors: { new_password: [next.error.issues[0]!.message] } };
  if (fd.get("new_password") !== fd.get("confirm_password")) return { error: "Please correct the highlighted fields.", fieldErrors: { confirm_password: ["Passwords do not match"] } };
  if (!(await rateLimit("password-change", 5, 900))) return { error: "Too many attempts. Please try again later." };
  const supabase = await createClient();
  const { error: authErr } = await supabase.auth.signInWithPassword({ email: user.email!, password: current });
  if (authErr) return { error: "Your current password is incorrect.", fieldErrors: { current_password: ["Incorrect password"] } };
  const { error } = await supabase.auth.updateUser({ password: next.data });
  if (error) return { error: error.message };
  return { ok: true, message: "Password changed." };
}

export async function deleteAccountAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, profile } = await requireUser("/dashboard/settings");
  if (String(fd.get("confirm") ?? "").trim().toUpperCase() !== "DELETE") {
    return { error: "Type DELETE to confirm.", fieldErrors: { confirm: ["Type DELETE to confirm"] } };
  }
  if (profile.role === "admin") return { error: "Administrator accounts must be removed by another administrator." };
  const supabase = await createClient();
  const { error: authErr } = await supabase.auth.signInWithPassword({ email: user.email!, password: String(fd.get("password") ?? "") });
  if (authErr) return { error: "Your password is incorrect.", fieldErrors: { password: ["Incorrect password"] } };

  const admin = createAdminClient();
  // Remove listings where this user is the only owner
  const { data: memberships } = await admin.from("business_members").select("business_id").eq("user_id", user.id);
  for (const m of memberships ?? []) {
    const { count } = await admin.from("business_members").select("user_id", { count: "exact", head: true }).eq("business_id", m.business_id).neq("user_id", user.id);
    if (!count) await admin.from("businesses").update({ deleted_at: new Date().toISOString(), status: "draft" }).eq("id", m.business_id);
  }
  if (profile.avatar_path) await admin.storage.from(BUCKETS.avatars).remove([profile.avatar_path]);
  await admin.from("data_requests").insert({ user_id: null, email: user.email!, request_type: "deletion", status: "completed", details: "Self-service account deletion" });
  await sendEmail({ to: user.email!, ...emails.accountDeleted(profile.full_name) });

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[delete account]", error);
    return { error: "We couldn't delete your account. Please contact privacy support." };
  }
  await supabase.auth.signOut();
  redirect("/?account=deleted");
}
