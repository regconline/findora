import Link from "next/link";
import type { Metadata } from "next";
import { Eye, Inbox, Tags, Phone, MessageCircle, Globe } from "lucide-react";
import { Card, CardHeader, EmptyState, LinkButton, PageHeader, StatCard } from "@/components/ui";
import { BarList, ColumnChart } from "@/components/charts";
import { getManagedBusinesses, requireUser } from "@/lib/auth";
import { getBusinessStats } from "@/lib/stats";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };
const RANGES = [7, 30, 90];

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ business?: string; days?: string }> }) {
  await requireUser("/dashboard/analytics");
  const sp = await searchParams;
  const businesses = await getManagedBusinesses();
  if (!businesses.length) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analytics" />
        <EmptyState title="No listings yet" description="Analytics appear once you have a published listing." action={<LinkButton href="/dashboard/businesses/new">Create a listing</LinkButton>} />
      </div>
    );
  }
  const selected = businesses.find((b) => b.id === sp.business);
  const days = RANGES.includes(Number(sp.days)) ? Number(sp.days) : 30;
  const stats = await getBusinessStats(selected ? [selected.id] : businesses.map((b) => b.id), days);
  const t = stats.totals;
  const href = (o: { business?: string; days?: number }) => {
    const u = new URLSearchParams();
    const b = "business" in o ? o.business : selected?.id;
    const d = o.days ?? days;
    if (b) u.set("business", b);
    if (d !== 30) u.set("days", String(d));
    return `/dashboard/analytics${u.size ? `?${u}` : ""}`;
  };
  const pill = (active: boolean) => cn("rounded-lg px-3 py-1.5 text-sm font-medium", active ? "bg-navy-900 text-white" : "text-muted hover:bg-surface");

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Counts are de-duplicated per visitor per day and exclude known bots. Totals are all-time; charts show the selected period." />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Business" className="flex flex-wrap gap-1">
          <Link href={href({ business: undefined })} className={pill(!selected)}>All listings</Link>
          {businesses.map((b) => <Link key={b.id} href={href({ business: b.id })} className={pill(selected?.id === b.id)}>{b.name}</Link>)}
        </nav>
        <nav aria-label="Period" className="flex gap-1">
          {RANGES.map((r) => <Link key={r} href={href({ days: r })} className={pill(r === days)}>{r} days</Link>)}
        </nav>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Profile views" value={t.profile_views} icon={Eye} />
        <StatCard label="Service views" value={t.service_views} icon={Tags} />
        <StatCard label="Enquiries" value={t.enquiries} icon={Inbox} />
        <StatCard label="Telephone clicks" value={t.phone} icon={Phone} />
        <StatCard label="WhatsApp clicks" value={t.whatsapp} icon={MessageCircle} />
        <StatCard label="Website clicks" value={t.website} icon={Globe} />
      </div>
      <Card className="space-y-8 p-5 sm:p-6">
        <ColumnChart title={`Profile views — last ${days} days`} data={stats.series.map((s) => ({ day: s.day, value: s.views }))} />
        <div className="grid gap-8 lg:grid-cols-2">
          <ColumnChart title="Contact activity" color="#102C3B" data={stats.series.map((s) => ({ day: s.day, value: s.contacts }))} />
          <ColumnChart title="Enquiries" color="#F2A93B" data={stats.series.map((s) => ({ day: s.day, value: s.enquiries }))} />
        </div>
      </Card>
      <Card>
        <CardHeader title="Contact actions (all time)" description="How customers chose to reach you." />
        <div className="p-5 sm:p-6">
          <BarList items={[
            { label: "Telephone", value: t.phone },
            { label: "WhatsApp", value: t.whatsapp },
            { label: "Email", value: t.email },
            { label: "Website", value: t.website },
            { label: "Directions", value: t.directions },
            { label: "Social media", value: t.social },
            { label: "Enquiry form", value: t.enquiries },
          ]} />
        </div>
      </Card>
    </div>
  );
}
