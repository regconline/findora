import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ExternalLink, ArrowLeft } from "lucide-react";
import { Card, CardHeader, PageHeader, StatusBadge, Alert } from "@/components/ui";
import { ActionForm, CheckboxField, ConfirmButton, SelectField, SubmitButton, TextField, TextareaField } from "@/components/form";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getManagedBusinessProfile } from "@/lib/dashboard-data";
import { BUSINESS_TYPES } from "@/lib/constants";
import { formatDateTime, formatPhone, formatPrice, storageUrl } from "@/lib/utils";
import { adminEditBusinessAction, deleteBusinessPermanentlyAction, moderateBusinessAction, toggleImageHiddenAction, updateBusinessFlagsAction } from "../../actions";

export const metadata: Metadata = { title: "Review business" };

export default async function AdminBusinessDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();
  const b = await getManagedBusinessProfile(id);
  if (!b) notFound();
  const supabase = await createClient();
  const [{ data: members }, { data: reports }, { count: enquiries }] = await Promise.all([
    supabase.from("business_members").select("role, profiles(id, full_name, email, status)").eq("business_id", id),
    supabase.from("business_reports").select("id, reason, details, status, created_at").eq("business_id", id).order("created_at", { ascending: false }).limit(10),
    supabase.from("customer_enquiries").select("id", { count: "exact", head: true }).eq("business_id", id),
  ]);
  type M = { role: string; profiles: { id: string; full_name: string; email: string; status: string } | null };
  const l = b.location;
  const dt = (label: string, v: React.ReactNode) => (v ? <div className="grid grid-cols-[140px_1fr] gap-2 py-1.5"><dt className="text-muted">{label}</dt><dd className="break-words">{v}</dd></div> : null);

  return (
    <div className="space-y-6">
      <Link href="/admin/businesses" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-heading"><ArrowLeft className="size-4" aria-hidden /> Businesses</Link>
      <PageHeader title={b.name} description={<span className="inline-flex flex-wrap items-center gap-2"><StatusBadge status={b.deleted_at ? "deleted" : b.status} /> Created {formatDateTime(b.created_at)}{b.submitted_at ? ` · submitted ${formatDateTime(b.submitted_at)}` : ""}</span>}>
        {b.status === "approved" && !b.deleted_at ? <Link href={`/businesses/${b.slug}`} target="_blank" className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-semibold"><ExternalLink className="size-4" aria-hidden /> Public page</Link> : null}
      </PageHeader>

      <Card>
        <CardHeader title="Moderation decision" description="Owners are notified by email and in their dashboard." />
        <ActionForm action={moderateBusinessAction.bind(null, id)} className="space-y-4 p-5 sm:p-6">
          <TextareaField name="reason" label="Reason / message to the business" optional rows={3} hint="Required when rejecting or suspending. Be specific so the owner can fix the issue." />
          <div className="flex flex-wrap gap-2">
            {b.status !== "approved" ? <SubmitButton name="decision" value="approve">Approve and publish</SubmitButton> : null}
            {b.status !== "rejected" && b.status !== "approved" ? <SubmitButton name="decision" value="reject" variant="outline">Reject</SubmitButton> : null}
            {b.status === "approved" ? <SubmitButton name="decision" value="suspend" variant="danger-outline">Suspend</SubmitButton> : null}
            {b.status === "suspended" || b.deleted_at ? <SubmitButton name="decision" value="restore" variant="navy">Restore listing</SubmitButton> : null}
          </div>
        </ActionForm>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Listing information" />
            <dl className="p-5 text-sm sm:p-6">
              {dt("Category", [b.category?.name, b.subcategory?.name].filter(Boolean).join(" › "))}
              {dt("Business type", BUSINESS_TYPES.find((t) => t.value === b.business_type)?.label)}
              {dt("Tagline", b.tagline)}
              {dt("Description", <span className="whitespace-pre-line">{b.description}</span>)}
              {dt("Established", b.year_established)}
              {dt("Registration no.", b.registration_number ? `${b.registration_number}${b.show_registration_number ? " (public)" : " (private)"}` : null)}
              {dt("Location", l ? [l.street_address, l.suburb, l.town, l.city, l.province, l.postal_code].filter(Boolean).join(", ") : <span className="text-danger">Missing</span>)}
              {dt("Service areas", l?.service_areas.join(", "))}
              {dt("Phone", formatPhone(b.phone))}
              {dt("WhatsApp", formatPhone(b.whatsapp))}
              {dt("Email", b.email)}
              {dt("Website", b.website ? <a href={b.website} target="_blank" rel="noopener nofollow" className="text-emerald-700 underline">{b.website}</a> : null)}
              {dt("Social", [b.facebook_url, b.instagram_url, b.tiktok_url, b.linkedin_url].filter(Boolean).join(" · "))}
              {dt("Contact consent", b.contact_publish_consent ? "Given" : <span className="text-danger">Not given</span>)}
              {dt("Enquiries", String(enquiries ?? 0))}
            </dl>
          </Card>
          <Card>
            <CardHeader title={`Services (${b.services.length})`} />
            <ul className="divide-y divide-line text-sm">
              {b.services.map((s) => <li key={s.id} className="flex justify-between gap-3 px-5 py-3 sm:px-6"><span><strong className="text-heading">{s.name}</strong>{s.description ? <span className="block text-muted">{s.description}</span> : null}</span><span className="shrink-0 text-muted">{formatPrice(s.price, s.price_type)}</span></li>)}
              {!b.services.length ? <li className="px-6 py-6 text-muted">No services.</li> : null}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Images" description="Hide inappropriate photographs without deleting the listing." />
            <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 sm:p-6">
              {b.logo_path ? <figure><Image src={storageUrl("business-logos", b.logo_path)!} alt="Logo" width={200} height={200} className="aspect-square w-full rounded-lg border border-line object-contain" /><figcaption className="mt-1 text-xs text-muted">Logo</figcaption></figure> : null}
              {b.cover_path ? <figure className="col-span-2"><Image src={storageUrl("business-covers", b.cover_path)!} alt="Cover" width={500} height={250} className="aspect-[2/1] w-full rounded-lg object-cover" /><figcaption className="mt-1 text-xs text-muted">Cover</figcaption></figure> : null}
              {b.images.map((img) => (
                <figure key={img.id} className={img.is_hidden ? "opacity-50" : ""}>
                  <Image src={storageUrl(img.bucket, img.storage_path)!} alt={img.alt_text} width={240} height={180} className="aspect-[4/3] w-full rounded-lg object-cover" />
                  <form action={toggleImageHiddenAction.bind(null, img.id, !img.is_hidden, id)} className="mt-1"><ConfirmButton variant="ghost" size="sm">{img.is_hidden ? "Unhide" : "Hide"}</ConfirmButton></form>
                </figure>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Owners & managers" />
            <ul className="divide-y divide-line text-sm">
              {((members as unknown as M[]) ?? []).map((m) => m.profiles ? (
                <li key={m.profiles.id} className="px-5 py-3"><Link href={`/admin/users/${m.profiles.id}`} className="font-medium text-heading hover:underline">{m.profiles.full_name || m.profiles.email}</Link><span className="block text-muted">{m.profiles.email} · {m.role}{m.profiles.status !== "active" ? ` · ${m.profiles.status}` : ""}</span></li>
              ) : null)}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Verification, featuring & plan" description="Verification badges must reflect a real check. No payments are taken in the MVP." />
            <ActionForm action={updateBusinessFlagsAction.bind(null, id)} className="space-y-4 p-5">
              <CheckboxField name="is_verified" defaultChecked={b.is_verified} label="Verified business" />
              <TextareaField name="verification_notes" label="Verification notes" optional rows={2} defaultValue={(b as unknown as { verification_notes: string | null }).verification_notes} hint="E.g. “CIPC registration checked 2026-11-20; phone call confirmed.”" />
              <CheckboxField name="is_featured" defaultChecked={b.is_featured} label="Featured (shown with a “Featured” label)" />
              <TextField name="featured_until" label="Featured until" optional type="date" defaultValue={b.featured_until?.slice(0, 10)} />
              <CheckboxField name="is_sponsored" defaultChecked={b.is_sponsored} label="Sponsored" />
              <SelectField name="plan" label="Plan" defaultValue={b.plan} options={[{ value: "free", label: "Free" }, { value: "premium", label: "Premium (future)" }, { value: "sponsored", label: "Sponsored (future)" }]} />
              <SubmitButton variant="navy" pendingText="Saving…">Save</SubmitButton>
            </ActionForm>
          </Card>
          <Card>
            <CardHeader title="Edit core details" />
            <ActionForm action={adminEditBusinessAction.bind(null, id)} className="space-y-4 p-5">
              <TextField name="name" label="Name" defaultValue={b.name} />
              <TextField name="slug" label="URL slug" defaultValue={b.slug} hint={`/businesses/${b.slug}`} />
              <TextareaField name="description" label="Description" rows={5} defaultValue={b.description} />
              <SubmitButton variant="outline">Save changes</SubmitButton>
            </ActionForm>
          </Card>
          {reports?.length ? (
            <Card>
              <CardHeader title="Reports about this business" />
              <ul className="divide-y divide-line text-sm">
                {reports.map((r) => <li key={r.id} className="px-5 py-3"><StatusBadge status={r.status} /> <strong>{r.reason.replace(/_/g, " ")}</strong><p className="mt-1 text-muted">{r.details}</p></li>)}
              </ul>
            </Card>
          ) : null}
          <Card className="border-danger/30 p-5">
            <h2 className="font-semibold text-danger">Delete permanently</h2>
            <p className="mt-1 text-sm text-muted">For fraudulent listings. Removes the listing, its images, services, enquiries and statistics.</p>
            <Alert tone="warning" className="mt-3">This cannot be undone. Consider suspending instead.</Alert>
            <form action={deleteBusinessPermanentlyAction.bind(null, id)} className="mt-3"><ConfirmButton variant="danger" size="md" confirm={`Permanently delete ${b.name}?`}>Delete listing</ConfirmButton></form>
          </Card>
        </div>
      </div>
    </div>
  );
}
