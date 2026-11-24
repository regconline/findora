import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { env } from "@/lib/env";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** Normalises South African phone numbers to E.164 (+27…). Returns null if invalid. */
export function normaliseSaPhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = input.replace(/[^\d+]/g, "");
  let d = digits.startsWith("+") ? digits.slice(1) : digits;
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0") && d.length === 10) d = "27" + d.slice(1);
  if (/^27\d{9}$/.test(d)) return "+" + d;
  if (/^\d{8,15}$/.test(d) && !d.startsWith("0")) return "+" + d; // international
  return null;
}

export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  const m = /^\+27(\d{2})(\d{3})(\d{4})$/.exec(e164);
  return m ? `0${m[1]} ${m[2]} ${m[3]}` : e164;
}

export function whatsappLink(e164: string, text?: string): string {
  const n = e164.replace(/\D/g, "");
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function telLink(e164: string): string {
  return `tel:${e164}`;
}

export function normaliseUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  const v = input.trim();
  if (!v) return null;
  const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withProto);
    if (!["http:", "https:"].includes(u.protocol) || !u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function displayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const zar = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 2 });
export function formatPrice(price: number | string | null | undefined, type: string): string {
  const n = price == null || price === "" ? null : Number(price);
  const amount = n == null ? "" : zar.format(n).replace(/\.00$/, "");
  switch (type) {
    case "free":
      return "Free";
    case "quote":
      return "Quotation required";
    case "hourly":
      return amount ? `${amount} / hour` : "Hourly rate";
    case "starting_from":
      return amount ? `From ${amount}` : "Price on request";
    default:
      return amount || "Price on request";
  }
}

export function storageUrl(bucket: string, path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${env.supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

export function formatDate(d: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!d) return "";
  return new Intl.DateTimeFormat("en-ZA", opts ?? { day: "numeric", month: "long", year: "numeric" }).format(new Date(d));
}

export function formatDateTime(d: string | Date | null | undefined) {
  return formatDate(d, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function initials(name: string | null | undefined) {
  return (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

export function readingMinutes(markdown: string) {
  return Math.max(1, Math.round(markdown.split(/\s+/).length / 220));
}

/** Plain-text excerpt from markdown for meta descriptions. */
export function plainText(markdown: string, n = 160) {
  return truncate(
    markdown
      .replace(/```[\s\S]*?```/g, "")
      .replace(/!\[[^\]]*]\([^)]*\)/g, "")
      .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
      .replace(/[#>*_`~-]/g, "")
      .replace(/\s+/g, " ")
      .trim(),
    n,
  );
}

export function pageRange(page: number, pages: number): (number | "…")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pages - 1, page + 1);
  if (start > 2) out.push("…");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < pages - 1) out.push("…");
  out.push(pages);
  return out;
}

/** Only allow same-origin relative redirects (prevents open redirects). */
export function safeNext(next: string | null | undefined, fallback = "/dashboard") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

/** True when next/image may optimise the URL (Supabase Storage); other hosts render unoptimised. */
export function isOptimizableImage(url: string | null | undefined) {
  if (!url) return false;
  if (url.startsWith("/")) return true;
  try {
    return Boolean(env.supabaseUrl) && new URL(url).hostname === new URL(env.supabaseUrl).hostname;
  } catch {
    return false;
  }
}
