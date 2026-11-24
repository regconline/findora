import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { emails, sendEmail } from "@/lib/email";
import { safeNext } from "@/lib/utils";

/**
 * Handles links from Supabase auth emails: sign-up verification, password recovery,
 * email change and magic links. Supports both token_hash (recommended email templates)
 * and PKCE `code` flows.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"), type === "recovery" ? "/reset-password" : "/dashboard");
  const supabase = await createClient();

  let ok = false;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  if (!ok) {
    return NextResponse.redirect(new URL("/login?error=link_expired", url.origin));
  }

  if (type === "signup" || type === "email") {
    const { data } = await supabase.auth.getUser();
    const u = data.user;
    if (u?.email) {
      const meta = (u.user_metadata ?? {}) as { full_name?: string; account_type?: string };
      const msg = emails.welcome(meta.full_name ?? "", meta.account_type === "business_owner");
      await sendEmail({ to: u.email, ...msg });
    }
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
