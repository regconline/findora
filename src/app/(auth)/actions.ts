"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { getSettings } from "@/lib/data";
import { rateLimit, verifyTurnstile } from "@/lib/security";
import { forgotPasswordSchema, loginSchema, parseForm, registerSchema, resetPasswordSchema } from "@/lib/validation";
import { safeNext } from "@/lib/utils";
import type { ActionState } from "@/lib/types";

const GENERIC_LOGIN_ERROR = "Incorrect email or password.";

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseForm(loginSchema, fd);
  if (!parsed.success) return parsed.state;
  if (!(await rateLimit("login", 10, 300))) return { error: "Too many sign-in attempts. Please wait a few minutes and try again." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) {
    if (/confirm/i.test(error.message)) {
      return { error: "Please verify your email address first. Check your inbox for the verification link.", values: { email: parsed.data.email } };
    }
    return { error: GENERIC_LOGIN_ERROR, values: { email: parsed.data.email } };
  }
  redirect(safeNext(parsed.data.next));
}

export async function registerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseForm(registerSchema, fd);
  if (!parsed.success) return parsed.state;
  const d = parsed.data;

  const settings = await getSettings();
  if (!settings.registration_open || (d.account_type === "business_owner" && !settings.business_registration_open)) {
    return { error: "New registrations are temporarily paused. Please try again later." };
  }
  if (!(await verifyTurnstile(fd.get("cf-turnstile-response")))) return { error: "Please complete the security check." };
  if (!(await rateLimit("register", 5, 3600))) return { error: "Too many registrations from this network. Please try again later." };

  const next = d.account_type === "business_owner" ? "/dashboard/businesses/new" : "/dashboard";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: d.email,
    password: d.password,
    options: {
      emailRedirectTo: `${env.siteUrl}/auth/confirm?next=${encodeURIComponent(next)}`,
      data: {
        full_name: d.full_name,
        phone: d.phone ?? null,
        account_type: d.account_type,
        accepted_terms: d.accept_terms,
        marketing_opt_in: d.marketing_opt_in,
      },
    },
  });
  if (error) {
    if (/password/i.test(error.message)) return { error: error.message, fieldErrors: { password: [error.message] } };
    console.error("[register]", error.message);
    return { error: "We could not create your account right now. Please try again." };
  }
  // If email confirmation is disabled in Supabase, a session is returned immediately.
  if (data.session) redirect(next);
  redirect(`/verify-email?email=${encodeURIComponent(d.email)}`);
}

export async function resendVerificationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseForm(forgotPasswordSchema, fd);
  if (!parsed.success) return parsed.state;
  if (!(await rateLimit("resend", 3, 900))) return { error: "Please wait a few minutes before requesting another email." };
  const supabase = await createClient();
  await supabase.auth.resend({ type: "signup", email: parsed.data.email, options: { emailRedirectTo: `${env.siteUrl}/auth/confirm` } });
  return { ok: true, message: "If an unverified account exists for this address, we've sent a new verification link." };
}

export async function forgotPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseForm(forgotPasswordSchema, fd);
  if (!parsed.success) return parsed.state;
  if (!(await rateLimit("forgot", 5, 900))) return { error: "Too many requests. Please try again in a few minutes." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.siteUrl}/auth/confirm?next=/reset-password`,
  });
  // Same response whether or not the account exists (prevents account enumeration).
  return { ok: true, message: "If an account exists for that email, you'll receive a password reset link shortly." };
}

export async function resetPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseForm(resetPasswordSchema, fd);
  if (!parsed.success) return parsed.state;
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { error: "Your reset link has expired. Please request a new one." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };
  redirect("/dashboard?password=updated");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
