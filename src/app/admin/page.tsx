import Link from "next/link";
import type { Metadata } from "next";
import { Users, Store, Clock, CheckCircle2, Ban, Inbox, UserPlus, FileText, Flag } from "lucide-react";
import { Card, CardHeader, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Overview" };

export default async function AdminOverview() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: s }, { data: pending }, { data: reports }] = await Promise.all([
    supabase.rpc("admin_overview_stats"),
    supabase.from("businesses").select("id, name, submitted_at, categories(name)").eq("status", "pending").is("deleted_at", null).order("submitted_at").limit(8),
    supabase.from("business_reports").select("id, reason, created_at, status, business:businesses(name)").in("status", ["open", "reviewing"]).order("created_at").limit(6),
  ]);
  const st = (s ?? {}) as Record<string, number>;
  type P = { id: string; name: string; submitted_at: string; categories: { name: string } | null };
  type R = { id: string; reason: string; created_at: string; status: string; business: { name: string } | null };
  return (
    <div className="space-y-6">
      <PageHeader title="Platform overview" description="Live figures from the database." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total users" value={st.users ?? 0} icon={Users} hint={`${st.customers ?? 0} customers · ${st.business_owners ?? 0} owners`} />
        <StatCard label="New registrations (7d)" value={st.new_users_7d ?? 0} icon={UserPlus} />
        <StatCard label="Total businesses" value={st.businesses ?? 0} icon={Store} />
        <StatCard label="Pending approval" value={st.pending ?? 0} icon={Clock} />
        <StatCard label="Approved" value={st.approved ?? 0} icon={CheckCircle2} />
        <StatCard label="Suspended" value={st.suspended ?? 0} icon={Ban} />
        <StatCard label="Total enquiries" value={st.enquiries ?? 0} icon={Inbox} hint={`${st.enquiries_7d ?? 0} in the last 7 days`} />
        <StatCard label="Published articles" value={st.published_articles ?? 0} icon={FileText} />
        <StatCard label="Open reports" value={st.open_reports ?? 0} icon={Flag} />
        <StatCard label="Searches (7d)" value={st.searches_7d ?? 0} hint={`${st.home_views_7d ?? 0} homepage visits`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Awaiting approval" description="Oldest first" action={<Link href="/admin/businesses?status=pending" className="text-sm font-medium text-emerald-700">View all</Link>} />
          <ul className="divide-y divide-line">
            {((pending as unknown as P[]) ?? []).map((b) => (
              <li key={b.id}><Link href={`/admin/businesses/${b.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-canvas sm:px-6"><span><span className="block font-medium text-navy-900">{b.name}</span><span className="text-xs text-muted">{b.categories?.name} · submitted {formatDateTime(b.submitted_at)}</span></span><StatusBadge status="pending" /></Link></li>
            ))}
            {!pending?.length ? <li className="px-6 py-8 text-center text-sm text-muted">No listings waiting. 🎉</li> : null}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Open reports" action={<Link href="/admin/reports" className="text-sm font-medium text-emerald-700">View all</Link>} />
          <ul className="divide-y divide-line">
            {((reports as unknown as R[]) ?? []).map((r) => (
              <li key={r.id}><Link href="/admin/reports" className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-canvas sm:px-6"><span><span className="block font-medium text-navy-900">{r.business?.name ?? "Removed business"}</span><span className="text-xs text-muted">{r.reason.replace(/_/g, " ")} · {formatDateTime(r.created_at)}</span></span><StatusBadge status={r.status} /></Link></li>
            ))}
            {!reports?.length ? <li className="px-6 py-8 text-center text-sm text-muted">No open reports.</li> : null}
          </ul>
        </Card>
      </div>
    </div>
  );
}
