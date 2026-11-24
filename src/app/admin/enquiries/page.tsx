import Link from "next/link";
import type { Metadata } from "next";
import { Alert, PageHeader, Pagination, StatusBadge } from "@/components/ui";
import { Table } from "@/components/admin-table";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Enquiries" };
const PAGE = 40;

/**
 * Operational oversight only: shows enquiry metadata (no message bodies or customer
 * contact details) to monitor volume and abuse, in line with POPIA purpose limitation.
 */
export default async function AdminEnquiries({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdmin();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { data, count } = await (await createClient())
    .from("customer_enquiries")
    .select("id, subject, status, created_at, customer_id, business:businesses(id, name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  type R = { id: string; subject: string; status: string; created_at: string; customer_id: string | null; business: { id: string; name: string } | null };
  return (
    <div className="space-y-6">
      <PageHeader title="Enquiries" description={`${count ?? 0} enquiries platform-wide`} />
      <Alert tone="info">Message content and customer contact details are hidden here. They are only visible to the business the enquiry was sent to.</Alert>
      <Table head={["Date", "Business", "Subject", "From", "Status"]}>
        {((data as unknown as R[]) ?? []).map((e) => (
          <tr key={e.id}>
            <td className="px-4 py-3 text-muted">{formatDateTime(e.created_at)}</td>
            <td className="px-4 py-3">{e.business ? <Link href={`/admin/businesses/${e.business.id}`} className="font-medium text-heading hover:underline">{e.business.name}</Link> : "—"}</td>
            <td className="px-4 py-3">{e.subject}</td>
            <td className="px-4 py-3 text-muted">{e.customer_id ? "Registered customer" : "Guest"}</td>
            <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} pages={Math.ceil((count ?? 0) / PAGE)} hrefFor={(p) => `/admin/enquiries${p > 1 ? `?page=${p}` : ""}`} />
    </div>
  );
}
