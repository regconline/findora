import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("cf-connecting-ip") ||
    "0.0.0.0"
  );
}

/**
 * Privacy-preserving visitor identifier: salted SHA-256 of IP + user agent + day.
 * Rotates daily, never stored with the raw IP, cannot be reversed.
 */
export async function visitorHash(): Promise<string> {
  const h = await headers();
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256")
    .update(`${serverEnv().analyticsSalt}|${await clientIp()}|${h.get("user-agent") ?? ""}|${day}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Fixed-window rate limit backed by Postgres (works across serverless instances).
 * Fails open if the database is unavailable so legitimate users are not locked out.
 */
export async function rateLimit(action: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const ipKey = createHash("sha256").update(serverEnv().analyticsSalt + (await clientIp())).digest("hex").slice(0, 24);
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_key: `${action}:${ipKey}`,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) return true;
    return data === true;
  } catch {
    return true;
  }
}

/** Cloudflare Turnstile verification. Skipped (returns true) when not configured. */
export async function verifyTurnstile(token: FormDataEntryValue | null): Promise<boolean> {
  const secret = serverEnv().turnstileSecret;
  if (!secret) return true;
  if (typeof token !== "string" || !token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, remoteip: await clientIp() }),
    });
    const json = (await res.json()) as { success?: boolean };
    return json.success === true;
  } catch {
    return false;
  }
}

/** Honeypot: real users never fill the hidden `website_url` field. */
export function isBot(fd: FormData): boolean {
  const v = fd.get("website_url");
  return typeof v === "string" && v.trim().length > 0;
}

export async function audit(
  actor: { id: string; email?: string | null },
  action: string,
  entityType: string,
  entityId: string | null,
  details: Record<string, unknown> = {},
) {
  try {
    await createAdminClient().from("audit_logs").insert({
      actor_id: actor.id,
      actor_email: actor.email ?? null,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
    });
  } catch (e) {
    console.error("[audit] failed", e);
  }
}

export async function notify(userIds: string[], n: { type: string; title: string; body?: string; link?: string }) {
  if (!userIds.length) return;
  try {
    await createAdminClient()
      .from("notifications")
      .insert(userIds.map((user_id) => ({ user_id, ...n })));
  } catch (e) {
    console.error("[notify] failed", e);
  }
}
