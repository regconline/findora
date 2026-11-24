import Link from "next/link";
import type { Metadata } from "next";
import { requireUser, getManagedBusinesses } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/site-header";
import { Avatar } from "@/components/ui";
import { DashboardNav, type NavItem } from "@/components/dashboard-nav";
import { signOutAction } from "@/app/(auth)/actions";
import { storageUrl } from "@/lib/utils";
import { BUCKETS } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Dashboard", template: "%s | Findora dashboard" }, robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile, user } = await requireUser();
  const businesses = await getManagedBusinesses();
  const supabase = await createClient();
  const [{ count: unreadEnquiries }, { count: unreadNotifications }] = await Promise.all([
    businesses.length
      ? supabase.from("customer_enquiries").select("id", { count: "exact", head: true }).in("business_id", businesses.map((b) => b.id)).eq("status", "new")
      : Promise.resolve({ count: 0 }),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
  ]);

  const isOwner = profile.role === "business_owner" || profile.role === "admin" || businesses.length > 0;
  const primary = businesses.length === 1 ? businesses[0] : null;
  const bizHref = (s: string) => (primary ? `/dashboard/businesses/${primary.id}${s}` : "/dashboard/businesses");

  const items: NavItem[] = isOwner
    ? [
        { href: "/dashboard", label: "Overview", icon: "overview", exact: true },
        { href: "/dashboard/businesses", label: "My Businesses", icon: "store", exact: true },
        { href: bizHref("/setup/business"), label: "Edit Profile", icon: "edit" },
        { href: bizHref("/setup/services"), label: "Services", icon: "services" },
        { href: bizHref("/setup/branding"), label: "Photographs", icon: "photos" },
        { href: "/dashboard/enquiries", label: "Enquiries", icon: "inbox", badge: unreadEnquiries ?? 0 },
        { href: "/dashboard/analytics", label: "Analytics", icon: "analytics" },
        { href: "/dashboard/saved", label: "Saved Businesses", icon: "saved" },
        { href: "/dashboard/my-enquiries", label: "Sent Enquiries", icon: "sent" },
        { href: "/dashboard/notifications", label: "Notifications", icon: "bell", badge: unreadNotifications ?? 0 },
        { href: "/dashboard/settings", label: "Account Settings", icon: "settings" },
      ]
    : [
        { href: "/dashboard", label: "Overview", icon: "overview", exact: true },
        { href: "/dashboard/saved", label: "Saved Businesses", icon: "saved" },
        { href: "/dashboard/my-enquiries", label: "My Enquiries", icon: "sent" },
        { href: "/dashboard/notifications", label: "Notifications", icon: "bell", badge: unreadNotifications ?? 0 },
        { href: "/dashboard/settings", label: "Account Settings", icon: "settings" },
        { href: "/dashboard/businesses/new", label: "List a Business", icon: "plus" },
      ];
  if (profile.role === "admin") items.push({ href: "/admin", label: "Administration", icon: "admin" });

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-line bg-white lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center justify-between px-4 lg:px-5">
          <Link href="/" aria-label="Findora home"><Logo /></Link>
        </div>
        <DashboardNav items={items} />
        <div className="hidden border-t border-line p-4 lg:absolute lg:inset-x-0 lg:bottom-0 lg:block">
          <div className="flex items-center gap-3">
            <Avatar src={storageUrl(BUCKETS.avatars, profile.avatar_path)} name={profile.full_name || profile.email || "?"} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-navy-900">{profile.full_name || "Your account"}</p>
              <p className="truncate text-xs text-muted">{profile.email}</p>
            </div>
          </div>
          <form action={signOutAction} className="mt-3">
            <button className="w-full rounded-lg border border-line py-2 text-sm font-medium text-navy-900 hover:bg-canvas">Sign out</button>
          </form>
        </div>
      </aside>
      <div className="min-w-0">
        <main id="main" className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">{children}</main>
        <form action={signOutAction} className="px-4 pb-8 text-center lg:hidden">
          <button className="text-sm font-medium text-muted underline">Sign out</button>
        </form>
      </div>
    </div>
  );
}
