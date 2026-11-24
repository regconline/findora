import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit, visitorHash } from "@/lib/security";

const schema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("view"), business_id: z.uuid(), service_id: z.uuid().optional() }),
  z.object({ type: z.literal("contact"), business_id: z.uuid(), event: z.enum(["phone", "whatsapp", "email", "website", "directions", "social"]) }),
  z.object({
    type: z.literal("platform"),
    event: z.enum(["home_view", "category_view", "search", "search_click"]),
    ref_id: z.uuid().optional(),
    query: z.string().trim().max(120).optional(),
    result_count: z.number().int().min(0).max(1_000_000).optional(),
  }),
]);

const BOT_UA = /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|monitor/i;

/**
 * First-party analytics. Stores no IP addresses or personal data: only a salted,
 * daily-rotating visitor hash used to de-duplicate views.
 */
export async function POST(req: Request) {
  if (BOT_UA.test(req.headers.get("user-agent") ?? "")) return new NextResponse(null, { status: 204 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  if (!(await rateLimit("track", 240, 300))) return new NextResponse(null, { status: 429 });

  try {
    const admin = createAdminClient();
    const e = parsed.data;
    const hash = await visitorHash();
    if (e.type === "view" || e.type === "contact") {
      const { data: b } = await admin.from("businesses").select("id").eq("id", e.business_id).eq("status", "approved").is("deleted_at", null).maybeSingle();
      if (!b) return new NextResponse(null, { status: 204 });
    }
    if (e.type === "view") {
      // duplicate views from the same visitor on the same day are ignored by a unique index
      await admin.from("business_views").insert({
        business_id: e.business_id,
        service_id: e.service_id ?? null,
        view_type: e.service_id ? "service" : "profile",
        visitor_hash: hash,
      });
    } else if (e.type === "contact") {
      await admin.from("contact_events").insert({ business_id: e.business_id, event_type: e.event, visitor_hash: hash });
    } else {
      await admin.from("platform_events").insert({
        event_type: e.event,
        ref_id: e.ref_id ?? null,
        query: e.event === "search" ? e.query?.toLowerCase() || null : null,
        result_count: e.result_count ?? null,
      });
    }
  } catch (err) {
    console.error("[track]", err);
  }
  return new NextResponse(null, { status: 204 });
}
