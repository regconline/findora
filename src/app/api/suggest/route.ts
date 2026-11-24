import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 60) ?? "";
  if (q.length < 2 || !isSupabaseConfigured) return NextResponse.json([]);
  const { data, error } = await createPublicClient().rpc("search_suggestions", { p_query: q });
  if (error) return NextResponse.json([]);
  return NextResponse.json(data ?? [], { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } });
}
