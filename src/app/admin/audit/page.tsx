import type { Metadata } from "next";
import { PageHeader, Pagination } from "@/components/ui";
import { AdminFilters, Table, ilike } from "@/components/admin-table";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Audit log" };
const PAGE = 50;

export default async function AdminAudit({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  let q = (await createClient()).from("audit_logs").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (sp.q) q = q.ilike("action", ilike(sp.q));
  const { data, count } = await q.range((page - 1) * PAGE, page * PAGE - 1);
  const rows = (data as { id: number; actor_email: string | null; action: string; entity_type: string; entity_id: string | null; details: Record<string, unknown>; created_at: string }[]) ?? [];
  return (
    <div className="space-y-6">
      <PageHeader title="Audit log" description="Append-only record of sensitive administrative actions." />
      <AdminFilters base="/admin/audit" q={sp.q} />
      <Table head={["When", "Administrator", "Action", "Record", "Details"]}>
        {rows.map((r) => (
          <tr key={r.id} className="align-top">
            <td className="whitespace-nowrap px-4 py-2 text-muted">{formatDateTime(r.created_at)}</td>
            <td className="px-4 py-2">{r.actor_email ?? "—"}</td>
            <td className="px-4 py-2 font-medium text-navy-900">{r.action}</td>
            <td className="px-4 py-2 text-muted">{r.entity_type}{r.entity_id ? <span className="block font-mono text-xs">{r.entity_id}</span> : null}</td>
            <td className="max-w-md px-4 py-2"><code className="block whitespace-pre-wrap break-all text-xs text-muted">{JSON.stringify(r.details)}</code></td>
          </tr>
        ))}
        {!rows.length ? <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">No entries.</td></tr> : null}
      </Table>
      <Pagination page={page} pages={Math.ceil((count ?? 0) / PAGE)} hrefFor={(p) => `/admin/audit?${new URLSearchParams(Object.entries({ q: sp.q, page: p > 1 ? String(p) : undefined }).filter(([, v]) => v) as [string, string][])}`} />
    </div>
  );
}
