import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/security";

/** POPIA data-subject access: returns the signed-in user's personal information as JSON. */
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!(await rateLimit("export", 5, 3600))) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const [profile, consents, saved, enquiries, memberships, notifications] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("consent_records").select("consent_type, granted, policy_version, context, created_at").eq("user_id", user.id),
    supabase.from("saved_businesses").select("created_at, business:businesses(name, slug)").eq("user_id", user.id),
    supabase.from("customer_enquiries").select("subject, message, name, email, phone, status, created_at, business:businesses(name)").eq("customer_id", user.id),
    supabase.from("business_members").select("role, business:businesses(*, business_locations(*), business_hours(*), services(*))").eq("user_id", user.id),
    supabase.from("notifications").select("type, title, body, created_at, read_at").eq("user_id", user.id),
  ]);

  try {
    await createAdminClient().from("data_requests").insert({ user_id: user.id, email: user.email ?? "", request_type: "export", status: "completed" });
  } catch {
    /* logging failure must not block access */
  }

  const body = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email, created_at: user.created_at, last_sign_in_at: user.last_sign_in_at },
    profile: profile.data,
    consents: consents.data,
    saved_businesses: saved.data,
    enquiries_sent: enquiries.data,
    businesses_managed: memberships.data,
    notifications: notifications.data,
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="findora-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
