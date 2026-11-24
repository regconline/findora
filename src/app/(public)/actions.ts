"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { env, serverEnv } from "@/lib/env";
import { emails, sendEmail } from "@/lib/email";
import { isBot, notify, rateLimit, verifyTurnstile } from "@/lib/security";
import { contactFormSchema, enquirySchema, parseForm, reportSchema } from "@/lib/validation";
import type { ActionState } from "@/lib/types";

const SENT: ActionState = { ok: true, message: "Thank you — your message has been sent." };

// ---------------------------------------------------------------------------
// Customer enquiries
// ---------------------------------------------------------------------------
export async function submitEnquiryAction(_: ActionState, fd: FormData): Promise<ActionState> {
  if (isBot(fd)) return { ok: true, message: "Your enquiry has been sent." }; // silently drop bots
  const parsed = parseForm(enquirySchema, fd);
  if (!parsed.success) return parsed.state;
  const d = parsed.data;
  if (!(await verifyTurnstile(fd.get("cf-turnstile-response")))) return { error: "Please complete the security check." };
  if (!(await rateLimit("enquiry", 5, 600))) return { error: "You've sent several enquiries in a short time. Please wait a few minutes." };

  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, status")
    .eq("id", d.business_id)
    .eq("status", "approved")
    .is("deleted_at", null)
    .maybeSingle();
  if (!business) return { error: "This business is not accepting enquiries right now." };

  let user = await getUser();
  let accountNote = "";

  // Optional account creation during the enquiry
  if (!user && d.create_account && d.password) {
    if (!(await rateLimit("register", 5, 3600))) return { error: "Too many registrations from this network. Untick “create an account” or try later." };
    const { data: su, error } = await supabase.auth.signUp({
      email: d.email,
      password: d.password,
      options: {
        emailRedirectTo: `${env.siteUrl}/auth/confirm?next=/dashboard/my-enquiries`,
        data: { full_name: d.name, phone: d.phone ?? null, account_type: "customer", accepted_terms: true },
      },
    });
    if (error) return { error: error.message, fieldErrors: { password: [error.message] } };
    // identities is empty when the email is already registered (Supabase hides this for privacy)
    if (su.user && (su.user.identities?.length ?? 0) > 0) {
      user = su.session ? su.user : null;
      accountNote = su.session
        ? " Your account has been created."
        : " Check your inbox to verify your new account — your enquiry will appear in your dashboard.";
      if (!su.session) {
        // link the enquiry to the new (unverified) account server-side
        return await insertEnquiry({ ...d, customer_id: su.user.id }, business, accountNote, true);
      }
    } else {
      accountNote = " An account already exists for this email — log in to see your enquiry history.";
    }
  }

  return await insertEnquiry({ ...d, customer_id: user?.id ?? null }, business, accountNote, false);
}

async function insertEnquiry(
  d: { business_id: string; service_id?: string; name: string; email: string; phone?: string; subject: string; message: string; customer_id: string | null },
  business: { id: string; name: string; slug: string },
  accountNote: string,
  useServiceRole: boolean,
): Promise<ActionState> {
  const row = {
    business_id: d.business_id,
    service_id: d.service_id ?? null,
    customer_id: d.customer_id,
    name: d.name,
    email: d.email,
    phone: d.phone ?? null,
    subject: d.subject,
    message: d.message,
  };
  const client = useServiceRole ? createAdminClient() : await createClient();
  const { error } = await client.from("customer_enquiries").insert(row);
  if (error) {
    console.error("[enquiry]", error);
    return { error: "We couldn't send your enquiry. Please try again or contact the business directly." };
  }

  // Notify business managers (email + in-app). Recipient emails are read server-side only.
  if (serverEnv().serviceRoleKey) {
    const admin = createAdminClient();
    const { data: members } = await admin.from("business_members").select("user_id, profiles(email)").eq("business_id", business.id);
    const list = (members as unknown as { user_id: string; profiles: { email: string | null } | null }[]) ?? [];
    const to = list.map((m) => m.profiles?.email).filter((x): x is string => Boolean(x));
    if (to.length) await sendEmail({ to, ...emails.newEnquiry(business.name, d) });
    await notify(list.map((m) => m.user_id), { type: "enquiry", title: `New enquiry: ${d.subject}`, body: `From ${d.name}`, link: "/dashboard/enquiries" });
    if (d.customer_id) {
      await admin.from("consent_records").insert({ user_id: d.customer_id, consent_type: "enquiry_processing", granted: true, context: `business:${business.id}` });
    }
  }
  await sendEmail({ to: d.email, ...emails.enquiryConfirmation(d.name, business.name, business.slug, d.subject) });
  revalidatePath("/dashboard/my-enquiries");
  return { ok: true, message: `Your enquiry has been sent to ${business.name}. They will contact you directly.${accountNote}` };
}

// ---------------------------------------------------------------------------
// Saved businesses
// ---------------------------------------------------------------------------
export async function toggleSavedAction(businessId: string): Promise<{ saved: boolean; requiresLogin?: boolean }> {
  const user = await getUser();
  if (!user) return { saved: false, requiresLogin: true };
  const supabase = await createClient();
  const { data: existing } = await supabase.from("saved_businesses").select("business_id").eq("user_id", user.id).eq("business_id", businessId).maybeSingle();
  if (existing) {
    await supabase.from("saved_businesses").delete().eq("user_id", user.id).eq("business_id", businessId);
    revalidatePath("/dashboard/saved");
    return { saved: false };
  }
  const { error } = await supabase.from("saved_businesses").insert({ user_id: user.id, business_id: businessId });
  revalidatePath("/dashboard/saved");
  return { saved: !error };
}

export async function isSavedAction(businessId: string): Promise<{ saved: boolean; signedIn: boolean }> {
  const user = await getUser();
  if (!user) return { saved: false, signedIn: false };
  const supabase = await createClient();
  const { data } = await supabase.from("saved_businesses").select("business_id").eq("user_id", user.id).eq("business_id", businessId).maybeSingle();
  return { saved: Boolean(data), signedIn: true };
}

// ---------------------------------------------------------------------------
// Reports (takedown process)
// ---------------------------------------------------------------------------
export async function submitReportAction(_: ActionState, fd: FormData): Promise<ActionState> {
  if (isBot(fd)) return { ok: true, message: "Thank you. Our team will review your report." };
  const parsed = parseForm(reportSchema, fd);
  if (!parsed.success) return parsed.state;
  if (!(await rateLimit("report", 5, 3600))) return { error: "You've submitted several reports recently. Please try again later." };
  const user = await getUser();
  const supabase = await createClient();
  const { error } = await supabase.from("business_reports").insert({
    business_id: parsed.data.business_id,
    image_id: parsed.data.image_id ?? null,
    reason: parsed.data.reason,
    details: parsed.data.details,
    reporter_email: parsed.data.reporter_email ?? user?.email ?? null,
    reporter_id: user?.id ?? null,
  });
  if (error) {
    console.error("[report]", error);
    return { error: "We couldn't submit your report. Please try again." };
  }
  const adminEmail = serverEnv().adminNotifyEmail;
  if (adminEmail) {
    await sendEmail({ to: adminEmail, subject: "New business report on Findora", html: `<p>A new report (${parsed.data.reason}) was submitted. Review it in the admin dashboard: ${env.siteUrl}/admin/reports</p>` });
  }
  return { ok: true, message: "Thank you. Our moderation team will review your report, usually within two working days." };
}

// ---------------------------------------------------------------------------
// Contact Us
// ---------------------------------------------------------------------------
export async function contactAction(_: ActionState, fd: FormData): Promise<ActionState> {
  if (isBot(fd)) return SENT;
  const parsed = parseForm(contactFormSchema, fd);
  if (!parsed.success) return parsed.state;
  if (!(await verifyTurnstile(fd.get("cf-turnstile-response")))) return { error: "Please complete the security check." };
  if (!(await rateLimit("contact", 3, 600))) return { error: "Please wait a few minutes before sending another message." };
  const user = await getUser();
  const { website_url, ...msg } = parsed.data;
  void website_url;
  try {
    const { error } = await createAdminClient().from("contact_messages").insert({ ...msg, user_id: user?.id ?? null });
    if (error) throw error;
  } catch (e) {
    console.error("[contact]", e);
    return { error: "We couldn't send your message. Please email us directly." };
  }
  const adminEmail = serverEnv().adminNotifyEmail;
  if (adminEmail) await sendEmail({ to: adminEmail, ...emails.contactMessage(parsed.data) });
  return { ...SENT, message: "Thank you — we've received your message and will reply by email, usually within two working days." };
}
