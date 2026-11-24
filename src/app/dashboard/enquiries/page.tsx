import Link from "next/link";
import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import { Card, EmptyState, PageHeader, Pagination, StatusBadge } from "@/components/ui";
import { getManagedBusinesses, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn, formatDateTime, truncate } from "@/lib/utils";

export const metadata: Metadata = { title: "Enquiries" };
const TABS = [
  { key: "inbox", label: "Inbox" },
  { key: "new", label: "Unread" },
  { key: "archived", label: "Archived" },
] as const;
const PAGE = 20;

export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<{ tab?: string; page?: string; business?: string }> }) {
  await requireUser("/dashboard/enquiries");
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "inbox";
  const page = Math.max(1, Number(sp.page) || 1);
  const businesses = await getManagedBusinesses();
  const ids = sp.business && businesses.some((b) => b.id === sp.business) ? [sp.business] : businesses.map((b) => b.id);
  const names = new Map(businesses.map((b) => [b.id, b.name]));

  type Row = { id: string; business_id: string; name: string; subject: string; message: string; status: string; created_at: string };
  let rows: Row[] = [];
  let total = 0;
  if (ids.length) {
    const supabase = await createClient();
    let q = supabase.from("customer_enquiries").select("id, business_id, name, subject, message, status, created_at", { count: "exact" }).in("business_id", ids);
    q = tab === "archived" ? q.eq("status", "archived") : tab === "new" ? q.eq("status", "new") : q.neq("status", "archived");
    const { data, count } = await q.order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
    rows = (data as Row[]) ?? [];
    total = count ?? 0;
  }
  const link = (o: Record<string, string | undefined>) => {
    const u = new URLSearchParams(Object.entries({ tab, business: sp.business, ...o }).filter(([, v]) => v && v !== "inbox") as [string, string][]);
    return `/dashboard/enquiries${u.size ? `?${u}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Enquiries" description="Messages customers sent through your Findora profile. Reply using their email or phone number." />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex gap-1" aria-label="Enquiry folders">
          {TABS.map((t) => (
            <Link key={t.key} href={link({ tab: t.key, page: undefined })} aria-current={tab === t.key ? "page" : undefined} className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", tab === t.key ? "bg-navy-900 text-white" : "text-muted hover:bg-white")}>{t.label}</Link>
          ))}
        </nav>
        {businesses.length > 1 ? (
          <form className="flex items-center gap-2 text-sm">
            <input type="hidden" name="tab" value={tab} />
            <label htmlFor="biz" className="text-muted">Business</label>
            <select id="biz" name="business" defaultValue={sp.business ?? ""} className="h-9 rounded-lg border border-line bg-white px-2">
              <option value="">All</option>
              {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <button className="h-9 rounded-lg border border-line bg-white px-3 font-medium">Filter</button>
          </form>
        ) : null}
      </div>
      {rows.length ? (
        <Card>
          <ul className="divide-y divide-line">
            {rows.map((e) => (
              <li key={e.id}>
                <Link href={`/dashboard/enquiries/${e.id}`} className={cn("flex gap-4 px-5 py-4 hover:bg-canvas sm:px-6", e.status === "new" && "bg-emerald-50/40")}>
                  <span aria-hidden className={cn("mt-2 size-2 shrink-0 rounded-full", e.status === "new" ? "bg-emerald-500" : "bg-transparent")} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className={cn("truncate text-navy-900", e.status === "new" ? "font-semibold" : "font-medium")}>{e.subject}</p>
                      <span className="text-xs text-muted">{formatDateTime(e.created_at)}</span>
                    </div>
                    <p className="text-sm text-muted">{e.name}{businesses.length > 1 ? ` → ${names.get(e.business_id)}` : ""}</p>
                    <p className="mt-1 truncate text-sm text-ink/70">{truncate(e.message, 140)}</p>
                  </div>
                  <span className="hidden sm:block"><StatusBadge status={e.status} /></span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <EmptyState icon={Inbox} title={tab === "archived" ? "No archived enquiries" : tab === "new" ? "You're all caught up" : "No enquiries yet"} description={tab === "inbox" ? "When customers send enquiries from your profile they'll appear here, and we'll email you." : undefined} />
      )}
      <Pagination page={page} pages={Math.ceil(total / PAGE)} hrefFor={(p) => link({ page: p > 1 ? String(p) : undefined })} />
    </div>
  );
}
