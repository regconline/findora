import Link from "next/link";
import type { Metadata } from "next";
import { BadgeCheck } from "lucide-react";
import { Alert, PageHeader, Pagination, StatusBadge, Badge } from "@/components/ui";
import { AdminFilters, Table, ilike } from "@/components/admin-table";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Businesses" };
const PAGE = 25;
const STATUSES = [
  { value: "pending", label: "Pending" }, { value: "approved", label: "Approved" }, { value: "draft", label: "Draft" },
  { value: "rejected", label: "Rejected" }, { value: "suspended", label: "Suspended" }, { value: "deleted", label: "Deleted" },
];

export default async function AdminBusinesses({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string; deleted?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  let q = supabase.from("businesses").select("id, name, slug, status, is_verified, is_featured, created_at, submitted_at, deleted_at, categories(name), business_locations(city, province)", { count: "exact" });
  if (sp.status === "deleted") q = q.not("deleted_at", "is", null);
  else {
    q = q.is("deleted_at", null);
    if (sp.status && STATUSES.some((s) => s.value === sp.status)) q = q.eq("status", sp.status);
  }
  if (sp.q) q = q.ilike("name", ilike(sp.q));
  q = sp.status === "pending" ? q.order("submitted_at", { ascending: true }) : q.order("created_at", { ascending: false });
  const { data, count } = await q.range((page - 1) * PAGE, page * PAGE - 1);
  type Row = { id: string; name: string; slug: string; status: string; is_verified: boolean; is_featured: boolean; created_at: string; submitted_at: string | null; deleted_at: string | null; categories: { name: string } | null; business_locations: { city: string; province: string }[] };
  const rows = (data as unknown as Row[]) ?? [];
  const link = (p: number) => `/admin/businesses?${new URLSearchParams(Object.entries({ q: sp.q, status: sp.status, page: p > 1 ? String(p) : undefined }).filter(([, v]) => v) as [string, string][])}`;
  return (
    <div className="space-y-6">
      <PageHeader title="Businesses" description={`${count ?? 0} matching listings`} />
      {sp.deleted ? <Alert tone="success">Business deleted permanently.</Alert> : null}
      <AdminFilters base="/admin/businesses" q={sp.q} status={sp.status} statuses={STATUSES} />
      <Table head={["Business", "Category", "Location", "Status", "Created", ""]}>
        {rows.map((b) => (
          <tr key={b.id} className="hover:bg-canvas/60">
            <td className="px-4 py-3">
              <Link href={`/admin/businesses/${b.id}`} className="font-medium text-navy-900 hover:underline">{b.name}</Link>
              {b.is_verified ? <BadgeCheck className="ml-1 inline size-4 text-emerald-600" aria-label="Verified" /> : null}
              {b.is_featured ? <Badge tone="sponsored" className="ml-2">Featured</Badge> : null}
            </td>
            <td className="px-4 py-3 text-muted">{b.categories?.name ?? "—"}</td>
            <td className="px-4 py-3 text-muted">{b.business_locations[0] ? `${b.business_locations[0].city}, ${b.business_locations[0].province}` : "—"}</td>
            <td className="px-4 py-3">{b.deleted_at ? <StatusBadge status="deleted" /> : <StatusBadge status={b.status} />}</td>
            <td className="px-4 py-3 text-muted">{formatDate(b.created_at, { day: "numeric", month: "short", year: "numeric" })}</td>
            <td className="px-4 py-3 text-right"><Link href={`/admin/businesses/${b.id}`} className="font-medium text-emerald-700">Review</Link></td>
          </tr>
        ))}
        {!rows.length ? <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">No businesses found.</td></tr> : null}
      </Table>
      <Pagination page={page} pages={Math.ceil((count ?? 0) / PAGE)} hrefFor={link} />
    </div>
  );
}
