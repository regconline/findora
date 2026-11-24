import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader, Pagination, StatusBadge, Badge } from "@/components/ui";
import { AdminFilters, Table, ilike } from "@/components/admin-table";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Users" };
const PAGE = 30;
const ROLES = [{ value: "customer", label: "Customers" }, { value: "business_owner", label: "Business owners" }, { value: "admin", label: "Admins" }, { value: "suspended", label: "Suspended" }];

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  let q = supabase.from("profiles").select("id, full_name, email, role, status, created_at", { count: "exact" }).is("deleted_at", null);
  if (sp.status === "suspended") q = q.eq("status", "suspended");
  else if (sp.status && ROLES.some((r) => r.value === sp.status)) q = q.eq("role", sp.status);
  if (sp.q) {
    const p = ilike(sp.q);
    q = q.or(`full_name.ilike.${p},email.ilike.${p}`);
  }
  const { data, count } = await q.order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  const rows = (data as { id: string; full_name: string; email: string; role: string; status: string; created_at: string }[]) ?? [];
  return (
    <div className="space-y-6">
      <PageHeader title="Users" description={`${count ?? 0} accounts`} />
      <AdminFilters base="/admin/users" q={sp.q} status={sp.status} statuses={ROLES} />
      <Table head={["Name", "Email", "Role", "Status", "Joined"]}>
        {rows.map((u) => (
          <tr key={u.id} className="hover:bg-canvas/60">
            <td className="px-4 py-3"><Link href={`/admin/users/${u.id}`} className="font-medium text-navy-900 hover:underline">{u.full_name || "—"}</Link></td>
            <td className="px-4 py-3 text-muted">{u.email}</td>
            <td className="px-4 py-3"><Badge tone={u.role === "admin" ? "info" : "neutral"}>{u.role.replace("_", " ")}</Badge></td>
            <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
            <td className="px-4 py-3 text-muted">{formatDate(u.created_at, { day: "numeric", month: "short", year: "numeric" })}</td>
          </tr>
        ))}
        {!rows.length ? <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">No users found.</td></tr> : null}
      </Table>
      <Pagination page={page} pages={Math.ceil((count ?? 0) / PAGE)} hrefFor={(p) => `/admin/users?${new URLSearchParams(Object.entries({ q: sp.q, status: sp.status, page: p > 1 ? String(p) : undefined }).filter(([, v]) => v) as [string, string][])}`} />
    </div>
  );
}
