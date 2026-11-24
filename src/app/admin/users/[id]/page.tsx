import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { Card, CardHeader, PageHeader, StatusBadge } from "@/components/ui";
import { ActionForm, SelectField, SubmitButton, TextareaField } from "@/components/form";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatPhone } from "@/lib/utils";
import { updateUserAction } from "../../actions";

export const metadata: Metadata = { title: "User" };

export default async function AdminUserDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();
  const supabase = await createClient();
  const { data: u } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!u) notFound();
  const [{ data: memberships }, { count: enquiries }, { count: saved }, { data: logs }] = await Promise.all([
    supabase.from("business_members").select("role, business:businesses(id, name, status)").eq("user_id", id),
    supabase.from("customer_enquiries").select("id", { count: "exact", head: true }).eq("customer_id", id),
    supabase.from("saved_businesses").select("business_id", { count: "exact", head: true }).eq("user_id", id),
    supabase.from("audit_logs").select("action, actor_email, created_at, details").eq("entity_id", id).order("created_at", { ascending: false }).limit(10),
  ]);
  type M = { role: string; business: { id: string; name: string; status: string } | null };
  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-navy-900"><ArrowLeft className="size-4" aria-hidden /> Users</Link>
      <PageHeader title={u.full_name || u.email} description={<span className="inline-flex items-center gap-2"><StatusBadge status={u.status} /> Joined {formatDateTime(u.created_at)}</span>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Account details" />
          <dl className="space-y-2 p-5 text-sm sm:p-6">
            <div><dt className="text-muted">Email</dt><dd>{u.email}</dd></div>
            <div><dt className="text-muted">Phone</dt><dd>{formatPhone(u.phone) || "—"}</dd></div>
            <div><dt className="text-muted">Location</dt><dd>{[u.city, u.province].filter(Boolean).join(", ") || "—"}</dd></div>
            <div><dt className="text-muted">Marketing consent</dt><dd>{u.marketing_opt_in ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted">Terms accepted</dt><dd>{u.terms_accepted_at ? formatDateTime(u.terms_accepted_at) : "—"}</dd></div>
            <div><dt className="text-muted">Activity</dt><dd>{enquiries ?? 0} enquiries sent · {saved ?? 0} saved businesses</dd></div>
          </dl>
        </Card>
        <Card>
          <CardHeader title="Permissions" description="Roles are assigned here on the server — never by users themselves." />
          <ActionForm action={updateUserAction.bind(null, id)} className="space-y-4 p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField name="role" label="Role" defaultValue={u.role} options={[{ value: "customer", label: "Customer" }, { value: "business_owner", label: "Business owner" }, { value: "admin", label: "Administrator" }]} />
              <SelectField name="status" label="Status" defaultValue={u.status === "deleted" ? "suspended" : u.status} options={[{ value: "active", label: "Active" }, { value: "suspended", label: "Suspended" }]} />
            </div>
            <TextareaField name="reason" label="Reason" optional rows={2} hint="Required when suspending. Sent to the user." />
            <SubmitButton variant="navy" pendingText="Saving…">Update user</SubmitButton>
          </ActionForm>
        </Card>
      </div>
      <Card>
        <CardHeader title="Businesses" />
        <ul className="divide-y divide-line text-sm">
          {((memberships as unknown as M[]) ?? []).map((m) => m.business ? <li key={m.business.id} className="flex items-center justify-between px-5 py-3 sm:px-6"><Link href={`/admin/businesses/${m.business.id}`} className="font-medium text-navy-900 hover:underline">{m.business.name}</Link><span className="flex items-center gap-2 text-muted">{m.role} <StatusBadge status={m.business.status} /></span></li> : null)}
          {!memberships?.length ? <li className="px-6 py-6 text-muted">No businesses.</li> : null}
        </ul>
      </Card>
      {logs?.length ? (
        <Card>
          <CardHeader title="Recent administrative actions" />
          <ul className="divide-y divide-line text-sm">{logs.map((l, i) => <li key={i} className="px-5 py-3 sm:px-6"><strong>{l.action}</strong> by {l.actor_email} · {formatDateTime(l.created_at)}</li>)}</ul>
        </Card>
      ) : null}
    </div>
  );
}
