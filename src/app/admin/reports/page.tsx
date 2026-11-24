import Link from "next/link";
import type { Metadata } from "next";
import { Flag } from "lucide-react";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { ActionForm, SelectField, SubmitButton, TextareaField } from "@/components/form";
import { AdminFilters } from "@/components/admin-table";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";
import { REPORT_REASONS } from "@/lib/constants";
import { updateReportAction } from "../actions";

export const metadata: Metadata = { title: "Reports" };
const STATUSES = [{ value: "open", label: "Open" }, { value: "reviewing", label: "Reviewing" }, { value: "resolved", label: "Resolved" }, { value: "dismissed", label: "Dismissed" }];

export default async function AdminReports({ searchParams }: { searchParams: Promise<{ status?: string; reason?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const supabase = await createClient();
  let q = supabase.from("business_reports").select("*, business:businesses(id, name, slug, status), image:business_images(storage_path, bucket)").order("created_at", { ascending: false }).limit(100);
  if (sp.status && STATUSES.some((s) => s.value === sp.status)) q = q.eq("status", sp.status);
  else if (!sp.status) q = q.in("status", ["open", "reviewing"]);
  if (sp.reason && REPORT_REASONS.some((r) => r.value === sp.reason)) q = q.eq("reason", sp.reason);
  const { data } = await q;
  type R = { id: string; reason: string; details: string; status: string; admin_notes: string | null; reporter_email: string | null; created_at: string; business: { id: string; name: string; slug: string; status: string } | null; image: { storage_path: string; bucket: string } | null };
  const rows = (data as unknown as R[]) ?? [];
  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Suspicious businesses, incorrect information, inappropriate photographs and spam." />
      <AdminFilters base="/admin/reports" status={sp.status} statuses={STATUSES} />
      <nav className="flex flex-wrap gap-2 text-sm">
        {REPORT_REASONS.map((r) => <Link key={r.value} href={`/admin/reports?reason=${r.value}${sp.status ? `&status=${sp.status}` : ""}`} className={sp.reason === r.value ? "rounded-full bg-navy-900 px-3 py-1 text-white" : "rounded-full bg-white px-3 py-1 ring-1 ring-line"}>{r.label}</Link>)}
      </nav>
      {rows.length ? (
        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.id}>
              <Card className="grid gap-5 p-5 lg:grid-cols-[1fr_340px]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={r.status} />
                    <span className="font-semibold text-navy-900">{REPORT_REASONS.find((x) => x.value === r.reason)?.label}</span>
                    <span className="text-xs text-muted">{formatDateTime(r.created_at)}</span>
                  </div>
                  <p className="mt-2 text-sm">{r.business ? <Link href={`/admin/businesses/${r.business.id}`} className="font-medium text-emerald-700 underline">{r.business.name}</Link> : "Business removed"}{r.business ? <> · <StatusBadge status={r.business.status} /></> : null}</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{r.details}</p>
                  {r.reporter_email ? <p className="mt-2 text-xs text-muted">Reporter: {r.reporter_email}</p> : null}
                  {r.image ? <p className="mt-2 text-xs"><a href={`/admin/businesses/${r.business?.id}`} className="underline">Reported photograph attached — review images on the business page</a></p> : null}
                </div>
                <ActionForm action={updateReportAction.bind(null, r.id)} className="space-y-3">
                  <SelectField name="status" label="Status" defaultValue={r.status} options={STATUSES} />
                  <TextareaField name="admin_notes" label="Internal notes" optional rows={3} defaultValue={r.admin_notes} />
                  <SubmitButton size="sm" variant="navy">Update report</SubmitButton>
                </ActionForm>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={Flag} title="No reports here" />
      )}
    </div>
  );
}
