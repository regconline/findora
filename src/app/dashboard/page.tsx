import Link from "next/link";
import type { Metadata } from "next";
import { Eye, Phone, Inbox, Globe, Tags, Heart, Send, Store, Plus, MessageCircle } from "lucide-react";
import { Alert, Card, CardHeader, EmptyState, LinkButton, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { ColumnChart } from "@/components/charts";
import { BusinessLogo } from "@/components/business-card";
import { getManagedBusinesses, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getBusinessStats } from "@/lib/stats";
import { formatDateTime, truncate } from "@/lib/utils";
import { getCompleteness } from "./businesses/actions";

export const metadata: Metadata = { title: "Overview" };

export default async function DashboardHome({ searchParams }: { searchParams: Promise<{ password?: string }> }) {
  const { profile, user } = await requireUser();
  const sp = await searchParams;
  const businesses = await getManagedBusinesses();
  const supabase = await createClient();
  const first = profile.full_name.split(" ")[0] || "there";
  const notice = sp.password === "updated" ? <Alert tone="success">Your password has been updated.</Alert> : null;

  if (!businesses.length && profile.role !== "business_owner") {
    const [{ count: saved }, { data: enquiries }] = await Promise.all([
      supabase.from("saved_businesses").select("business_id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("customer_enquiries").select("id, subject, status, created_at, business:businesses(name, slug)").eq("customer_id", user.id).order("created_at", { ascending: false }).limit(5),
    ]);
    type E = { id: string; subject: string; status: string; created_at: string; business: { name: string; slug: string } | null };
    const ens = (enquiries as unknown as E[] | null) ?? [];
    return (
      <div className="space-y-6">
        {notice}
        <PageHeader title={`Hello, ${first}`} description="Your saved businesses and enquiries in one place." >
          <LinkButton href="/businesses">Find businesses</LinkButton>
        </PageHeader>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Saved businesses" value={saved ?? 0} icon={Heart} />
          <StatCard label="Enquiries sent" value={ens.length} icon={Send} hint="Last 5 shown below" />
          <Card className="flex flex-col justify-between p-5">
            <p className="text-sm text-muted">Own a business?</p>
            <Link href="/dashboard/businesses/new" className="mt-2 font-semibold text-emerald-700 hover:underline">List it for free →</Link>
          </Card>
        </div>
        <Card>
          <CardHeader title="Recent enquiries" action={<LinkButton href="/dashboard/my-enquiries" variant="ghost" size="sm">View all</LinkButton>} />
          {ens.length ? (
            <ul className="divide-y divide-line">
              {ens.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 sm:px-6">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-heading">{e.subject}</p>
                    <p className="text-sm text-muted">{e.business ? <Link href={`/businesses/${e.business.slug}`} className="hover:underline">{e.business.name}</Link> : "Business no longer listed"} · {formatDateTime(e.created_at)}</p>
                  </div>
                  <StatusBadge status={e.status === "new" ? "new" : "read"} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-5"><EmptyState icon={MessageCircle} title="No enquiries yet" description="When you contact a business through Findora, your enquiries appear here." action={<LinkButton href="/businesses" variant="outline">Explore businesses</LinkButton>} /></div>
          )}
        </Card>
      </div>
    );
  }

  // Business owner overview
  const ids = businesses.map((b) => b.id);
  const [stats, { data: recent }, completeness] = await Promise.all([
    getBusinessStats(ids, 30),
    ids.length
      ? supabase.from("customer_enquiries").select("id, name, subject, message, status, created_at, business_id").in("business_id", ids).neq("status", "archived").order("created_at", { ascending: false }).limit(5)
      : Promise.resolve({ data: [] }),
    Promise.all(businesses.slice(0, 4).map(async (b) => ({ b, c: await getCompleteness(b.id) }))),
  ]);
  const t = stats.totals;
  type R = { id: string; name: string; subject: string; message: string; status: string; created_at: string; business_id: string };

  return (
    <div className="space-y-6">
      {notice}
      <PageHeader title={`Welcome back, ${first}`} description="Activity across your listings. All figures come from real visitor activity.">
        <LinkButton href="/dashboard/businesses/new" variant="outline"><Plus /> Add business</LinkButton>
      </PageHeader>

      {!businesses.length ? (
        <EmptyState icon={Store} title="Create your first listing" description="Your free business profile takes about ten minutes to set up." action={<LinkButton href="/dashboard/businesses/new">Start listing</LinkButton>} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard label="Profile views" value={t.profile_views} icon={Eye} />
            <StatCard label="Service views" value={t.service_views} icon={Tags} />
            <StatCard label="Telephone clicks" value={t.phone} icon={Phone} />
            <StatCard label="WhatsApp clicks" value={t.whatsapp} icon={MessageCircle} />
            <StatCard label="Website clicks" value={t.website} icon={Globe} />
            <StatCard label="Total enquiries" value={t.enquiries} icon={Inbox} hint={t.unread_enquiries ? `${t.unread_enquiries} unread` : undefined} />
          </div>

          <Card className="p-5 sm:p-6">
            <div className="grid gap-8 lg:grid-cols-3">
              <ColumnChart title="Profile views (30 days)" data={stats.series.map((s) => ({ day: s.day, value: s.views }))} />
              <ColumnChart title="Contact activity" color="#102C3B" data={stats.series.map((s) => ({ day: s.day, value: s.contacts }))} />
              <ColumnChart title="Enquiries" color="#F2A93B" data={stats.series.map((s) => ({ day: s.day, value: s.enquiries }))} />
            </div>
            {t.profile_views === 0 && t.enquiries === 0 ? <p className="mt-4 text-sm text-muted">No activity yet. Once your listing is published, views and contacts will appear here. Share your profile link to get started.</p> : null}
          </Card>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader title="Recent enquiries" action={<LinkButton href="/dashboard/enquiries" variant="ghost" size="sm">Open inbox</LinkButton>} />
              {(recent as R[] | null)?.length ? (
                <ul className="divide-y divide-line">
                  {(recent as R[]).map((e) => (
                    <li key={e.id}>
                      <Link href={`/dashboard/enquiries/${e.id}`} className="block px-5 py-3 hover:bg-canvas sm:px-6">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-medium text-heading">{e.subject}</p>
                          {e.status === "new" ? <StatusBadge status="new" /> : null}
                        </div>
                        <p className="truncate text-sm text-muted">{e.name} · {truncate(e.message, 80)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-8 text-center text-sm text-muted sm:px-6">No enquiries yet.</p>
              )}
            </Card>
            <Card>
              <CardHeader title="Profile completion" />
              <ul className="divide-y divide-line">
                {completeness.map(({ b, c }) => {
                  const done = c.filter((x) => x.done).length;
                  const pct = Math.round((done / c.length) * 100);
                  return (
                    <li key={b.id} className="flex items-center gap-3 px-5 py-4 sm:px-6">
                      <BusinessLogo path={b.logo_path} name={b.name} size={40} />
                      <div className="min-w-0 flex-1">
                        <Link href={`/dashboard/businesses/${b.id}`} className="block truncate text-sm font-semibold text-heading hover:underline">{b.name}</Link>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-canvas"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} /></div>
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-muted">{pct}%</span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
