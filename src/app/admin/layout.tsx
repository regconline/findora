import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/site-header";
import { DashboardNav, type NavItem } from "@/components/dashboard-nav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Administration", template: "%s | Findora admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin();
  const supabase = await createClient();
  const [{ count: pending }, { count: reports }, { count: messages }] = await Promise.all([
    supabase.from("businesses").select("id", { count: "exact", head: true }).eq("status", "pending").is("deleted_at", null),
    supabase.from("business_reports").select("id", { count: "exact", head: true }).in("status", ["open", "reviewing"]),
    supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);
  const items: NavItem[] = [
    { href: "/admin", label: "Overview", icon: "overview", exact: true },
    { href: "/admin/businesses", label: "Businesses", icon: "store", badge: pending ?? 0 },
    { href: "/admin/users", label: "Users", icon: "users" },
    { href: "/admin/categories", label: "Categories", icon: "categories" },
    { href: "/admin/reports", label: "Reports", icon: "reports", badge: reports ?? 0 },
    { href: "/admin/messages", label: "Contact messages", icon: "inbox", badge: messages ?? 0 },
    { href: "/admin/enquiries", label: "Enquiries", icon: "enquiries" },
    { href: "/admin/blog", label: "Blog", icon: "blog" },
    { href: "/admin/pages", label: "Pages", icon: "pages" },
    { href: "/admin/faqs", label: "FAQs", icon: "faq" },
    { href: "/admin/ads", label: "Advertising", icon: "ads" },
    { href: "/admin/analytics", label: "Analytics", icon: "analytics" },
    { href: "/admin/audit", label: "Audit log", icon: "audit" },
    { href: "/admin/settings", label: "Platform settings", icon: "settings" },
  ];
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="border-b border-line bg-white lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center justify-between gap-2 px-4">
          <Link href="/admin" aria-label="Admin home"><Logo /></Link>
          <span className="rounded bg-navy-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">Admin</span>
        </div>
        <DashboardNav items={items} />
        <div className="hidden px-6 pb-6 text-xs text-muted lg:block">
          Signed in as {profile.full_name || profile.email}. <Link href="/dashboard" className="underline">My dashboard</Link>
        </div>
      </aside>
      <main id="main" className="min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">{children}</main>
    </div>
  );
}
