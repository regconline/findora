import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowDown, ArrowUp, CheckCircle2, Circle, Eye, EyeOff, Trash2, Pencil, AlertTriangle } from "lucide-react";
import { Alert, Card, CardHeader, LinkButton, PageHeader, StatusBadge, EmptyState } from "@/components/ui";
import { WizardProgress, WIZARD_STEPS, type WizardStep } from "@/components/wizard-steps";
import { BusinessInfoForm, ContactForm, LocationForm, ServiceForm } from "@/components/business-forms";
import { ImageUpload } from "@/components/image-upload";
import { ConfirmButton, ActionForm, SubmitButton } from "@/components/form";
import { BusinessHeader, BusinessBody, BusinessSidebar, ContactActions } from "@/components/business-profile";
import { requireManagedBusiness } from "@/lib/auth";
import { getManagedBusinessProfile } from "@/lib/dashboard-data";
import { getCategories } from "@/lib/data";
import { BUCKETS, LIMITS } from "@/lib/constants";
import { formatPrice, storageUrl } from "@/lib/utils";
import {
  deleteGalleryImageAction, deleteServiceAction, getCompleteness, moveGalleryImageAction, moveServiceAction,
  removeBrandImageAction, saveContactAction, saveLocationAction, saveServiceAction, submitForReviewAction,
  toggleServiceAction, updateAltTextAction, updateBusinessInfoAction, uploadBrandImageAction, uploadGalleryAction,
} from "../../../actions";

type Props = { params: Promise<{ id: string; step: string }> };
export const metadata: Metadata = { title: "Edit listing" };

const TITLES: Record<string, { title: string; description: string }> = {
  business: { title: "Business information", description: "Name, description, category and business details." },
  location: { title: "Location", description: "Where you are based and the areas you serve." },
  contact: { title: "Contact details & hours", description: "How customers reach you, plus your operating hours." },
  branding: { title: "Branding & photographs", description: "Logo, cover photo and gallery. Clear photos build trust." },
  services: { title: "Services", description: "List what you offer. Add prices if you'd like customers to see them." },
  review: { title: "Review your listing", description: "This is how your profile will look to customers." },
  submit: { title: "Submit for publication", description: "Send your listing to the Findora team for review." },
};

export default async function SetupStepPage({ params }: Props) {
  const { id, step } = await params;
  if (!WIZARD_STEPS.some((s) => s.key === step) || step === "account") notFound();
  const { business } = await requireManagedBusiness(id);
  const profile = await getManagedBusinessProfile(id);
  if (!profile) notFound();
  const categories = await getCategories();
  const wizard = business.status === "draft" && !business.submitted_at && !business.approved_at;
  const mode = wizard ? "wizard" : "edit";
  const idx = WIZARD_STEPS.findIndex((s) => s.key === step);
  const prev = idx > 1 ? `/dashboard/businesses/${id}/setup/${WIZARD_STEPS[idx - 1]!.key}` : undefined;
  const next = idx < 7 ? `/dashboard/businesses/${id}/setup/${WIZARD_STEPS[idx + 1]!.key}` : undefined;
  const completeness = step === "review" || step === "submit" ? await getCompleteness(id) : [];
  const t = TITLES[step]!;

  return (
    <div className="space-y-6">
      {wizard ? <WizardProgress current={step as WizardStep} businessId={id} /> : null}
      <PageHeader title={t.title} description={<>{business.name} · <StatusBadge status={business.status} /></>}>
        {wizard ? null : <LinkButton href={`/dashboard/businesses/${id}`} variant="outline">Back to listing</LinkButton>}
      </PageHeader>
      {!wizard ? (
        <nav aria-label="Listing sections" className="-mx-1 flex gap-1 overflow-x-auto pb-1">
          {WIZARD_STEPS.slice(1, 7).map((s) => (
            <Link key={s.key} href={`/dashboard/businesses/${id}/setup/${s.key}`} aria-current={s.key === step ? "page" : undefined}
              className={s.key === step ? "shrink-0 rounded-lg bg-navy-900 px-3 py-1.5 text-sm font-medium text-white" : "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:bg-white"}>
              {s.label}
            </Link>
          ))}
        </nav>
      ) : null}
      {business.status === "rejected" && business.rejection_reason ? (
        <Alert tone="warning" title="Changes requested by the Findora team">{business.rejection_reason}</Alert>
      ) : null}

      {step === "business" ? (
        <Card className="p-5 sm:p-8">
          <BusinessInfoForm action={updateBusinessInfoAction.bind(null, id)} categories={categories} business={business} mode={mode} />
        </Card>
      ) : null}

      {step === "location" ? (
        <Card className="p-5 sm:p-8">
          <LocationForm action={saveLocationAction.bind(null, id)} location={profile.location} mode={mode} back={wizard ? prev : undefined} />
        </Card>
      ) : null}

      {step === "contact" ? (
        <Card className="p-5 sm:p-8">
          <ContactForm action={saveContactAction.bind(null, id)} business={business} hours={profile.hours} mode={mode} back={wizard ? prev : undefined} />
        </Card>
      ) : null}

      {step === "branding" ? (
        <>
          <div className="grid gap-6 md:grid-cols-[auto_1fr]">
            <Card className="p-5 sm:p-6">
              <ImageUpload action={uploadBrandImageAction.bind(null, id, "logo")} label="Business logo" hint="Square image works best. JPG, PNG or WebP up to 4 MB." currentUrl={storageUrl(BUCKETS.logos, business.logo_path)} />
              {business.logo_path ? (
                <form action={removeBrandImageAction.bind(null, id, "logo")} className="mt-2"><ConfirmButton variant="ghost" confirm="Remove your logo?">Remove logo</ConfirmButton></form>
              ) : null}
            </Card>
            <Card className="p-5 sm:p-6">
              <ImageUpload action={uploadBrandImageAction.bind(null, id, "cover")} aspect="wide" label="Cover photograph" hint="Shown across the top of your profile. Landscape, at least 1600 px wide recommended." currentUrl={storageUrl(BUCKETS.covers, business.cover_path)} />
              {business.cover_path ? (
                <form action={removeBrandImageAction.bind(null, id, "cover")} className="mt-2"><ConfirmButton variant="ghost" confirm="Remove your cover photo?">Remove cover photo</ConfirmButton></form>
              ) : null}
            </Card>
          </div>
          <Card>
            <CardHeader title="Gallery photographs" description={`${profile.images.length} of ${LIMITS.galleryImagesFree} photos. Show your premises, team and work.`} />
            <div className="space-y-6 p-5 sm:p-6">
              {profile.images.length < LIMITS.galleryImagesFree ? (
                <ImageUpload action={uploadGalleryAction.bind(null, id)} multiple label="Add photos" hint="Select several at once. Photos are compressed and resized automatically; location metadata is removed." />
              ) : null}
              {profile.images.length ? (
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {profile.images.map((img, i) => (
                    <li key={img.id} className="overflow-hidden rounded-xl border border-line bg-white">
                      <div className="relative aspect-[4/3] bg-canvas">
                        <Image src={storageUrl(img.bucket, img.storage_path)!} alt={img.alt_text} fill sizes="(min-width:1024px) 300px, 50vw" className="object-cover" />
                        {img.is_hidden ? <span className="absolute left-2 top-2 rounded bg-danger px-2 py-0.5 text-xs font-semibold text-white">Hidden by moderator</span> : null}
                      </div>
                      <div className="space-y-2 p-3">
                        <form action={updateAltTextAction.bind(null, id, img.id)} className="flex gap-2">
                          <label className="sr-only" htmlFor={`alt-${img.id}`}>Photo description</label>
                          <input id={`alt-${img.id}`} name="alt_text" defaultValue={img.alt_text} maxLength={200} placeholder="Describe this photo" className="h-9 min-w-0 flex-1 rounded-lg border border-line px-2.5 text-sm" />
                          <SubmitButton size="sm" variant="outline">Save</SubmitButton>
                        </form>
                        <div className="flex items-center gap-1">
                          <form action={moveGalleryImageAction.bind(null, id, img.id, "up")}><ConfirmButton variant="ghost" size="icon" disabled={i === 0} aria-label="Move earlier"><ArrowUp /></ConfirmButton></form>
                          <form action={moveGalleryImageAction.bind(null, id, img.id, "down")}><ConfirmButton variant="ghost" size="icon" disabled={i === profile.images.length - 1} aria-label="Move later"><ArrowDown /></ConfirmButton></form>
                          <form action={deleteGalleryImageAction.bind(null, id, img.id)} className="ml-auto"><ConfirmButton variant="danger-outline" confirm="Delete this photo?"><Trash2 /> Delete</ConfirmButton></form>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </Card>
          <StepNav prev={wizard ? prev : undefined} next={wizard ? next : undefined} nextLabel="Continue to services" />
        </>
      ) : null}

      {step === "services" ? (
        <>
          <Card>
            <CardHeader title="Your services" description={`${profile.services.length} listed`} />
            {profile.services.length ? (
              <ul className="divide-y divide-line">
                {profile.services.map((s, i) => (
                  <li key={s.id} className="px-5 py-4 sm:px-6">
                    <details className="group">
                      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 [&::-webkit-details-marker]:hidden">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-navy-900">{s.name} {!s.is_active ? <span className="ml-1 text-xs font-normal text-muted">(hidden)</span> : null}</p>
                          <p className="text-sm text-muted">{formatPrice(s.price, s.price_type)}{s.subcategory ? ` · ${s.subcategory.name}` : ""}</p>
                        </div>
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700"><Pencil className="size-3.5" aria-hidden /> Edit</span>
                      </summary>
                      <div className="mt-4 border-t border-line pt-4">
                        <ServiceForm action={saveServiceAction.bind(null, id, s.id)} service={s} categories={categories} />
                      </div>
                    </details>
                    <div className="mt-3 flex flex-wrap items-center gap-1">
                      <form action={moveServiceAction.bind(null, id, s.id, "up")}><ConfirmButton variant="ghost" size="icon" disabled={i === 0} aria-label={`Move ${s.name} up`}><ArrowUp /></ConfirmButton></form>
                      <form action={moveServiceAction.bind(null, id, s.id, "down")}><ConfirmButton variant="ghost" size="icon" disabled={i === profile.services.length - 1} aria-label={`Move ${s.name} down`}><ArrowDown /></ConfirmButton></form>
                      <form action={toggleServiceAction.bind(null, id, s.id, !s.is_active)}>
                        <ConfirmButton variant="ghost">{s.is_active ? <><EyeOff /> Hide</> : <><Eye /> Show</>}</ConfirmButton>
                      </form>
                      <form action={deleteServiceAction.bind(null, id, s.id)} className="ml-auto"><ConfirmButton variant="danger-outline" confirm={`Delete “${s.name}”?`}><Trash2 /> Delete</ConfirmButton></form>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-5 sm:p-6"><EmptyState title="No services yet" description="Add at least one service. Customers search for services as often as business names." /></div>
            )}
          </Card>
          <Card>
            <CardHeader title="Add a service" />
            <div className="p-5 sm:p-6"><ServiceForm action={saveServiceAction.bind(null, id, null)} categories={categories} /></div>
          </Card>
          <StepNav prev={wizard ? prev : undefined} next={wizard ? next : undefined} nextLabel="Review listing" nextDisabled={wizard && profile.services.length === 0} />
        </>
      ) : null}

      {step === "review" ? (
        <>
          <Checklist items={completeness} />
          <div className="overflow-hidden rounded-card border border-line bg-canvas">
            <p className="flex items-center gap-2 border-b border-line bg-white px-5 py-3 text-sm font-medium text-muted"><Eye className="size-4" aria-hidden /> Preview — exactly what customers will see once published</p>
            <div className="pointer-events-none select-none" aria-hidden>
              <BusinessHeader b={profile} />
              <div className="grid gap-6 p-5 lg:grid-cols-[1fr_340px]">
                <BusinessBody b={{ ...profile, services: profile.services.filter((s) => s.is_active), images: profile.images.filter((i) => !i.is_hidden) }} />
                <div className="space-y-6"><Card className="p-5"><ContactActions b={profile} preview /></Card><BusinessSidebar b={profile} /></div>
              </div>
            </div>
          </div>
          <StepNav prev={wizard ? prev : undefined} next={next} nextLabel={wizard ? "Continue to submit" : "Go to submission"} />
        </>
      ) : null}

      {step === "submit" ? (
        <Card className="p-5 sm:p-8">
          {business.status === "pending" ? (
            <Alert tone="info" title="Awaiting review">Your listing was submitted and is in the review queue. We&apos;ll email you when it&apos;s approved.</Alert>
          ) : business.status === "suspended" ? (
            <Alert tone="danger" title="Listing suspended">{business.suspended_reason || "Contact Findora support for help."}</Alert>
          ) : (
            <>
              <Checklist items={completeness} compact />
              <div className="mt-6 rounded-xl bg-canvas p-5 text-sm leading-relaxed text-ink/85">
                <p className="font-semibold text-navy-900">Before you submit</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Your information is accurate and you are authorised to list this business.</li>
                  <li>Photos are your own or you have permission to use them.</li>
                  <li>Your listing follows the <Link href="/listing-guidelines" className="text-emerald-700 underline">listing guidelines</Link>.</li>
                </ul>
              </div>
              <ActionForm action={submitForReviewAction.bind(null, id)} className="mt-6">
                <SubmitButton size="lg" pendingText="Submitting…" disabled={completeness.some((c) => c.required && !c.done)}>
                  {business.status === "approved" ? "Resubmit for review" : "Submit for publication"}
                </SubmitButton>
              </ActionForm>
              {business.status === "approved" ? <p className="mt-3 text-sm text-muted">Your listing is already published. You don&apos;t need to resubmit after edits — changes appear immediately.</p> : null}
            </>
          )}
          {prev ? <Link href={prev} className="mt-6 inline-block text-sm font-medium text-muted hover:text-navy-900">← Back</Link> : null}
        </Card>
      ) : null}
    </div>
  );
}

function StepNav({ prev, next, nextLabel, nextDisabled }: { prev?: string; next?: string; nextLabel: string; nextDisabled?: boolean }) {
  if (!prev && !next) return null;
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      {prev ? <Link href={prev} className="text-center text-sm font-medium text-muted hover:text-navy-900">← Back</Link> : <span />}
      {next ? (
        nextDisabled ? (
          <p className="flex items-center gap-2 text-sm text-muted"><AlertTriangle className="size-4 text-amber-500" aria-hidden /> Add at least one service to continue.</p>
        ) : (
          <LinkButton href={next} size="lg">{nextLabel}</LinkButton>
        )
      ) : null}
    </div>
  );
}

function Checklist({ items, compact }: { items: Awaited<ReturnType<typeof getCompleteness>>; compact?: boolean }) {
  const req = items.filter((i) => i.required);
  const done = items.filter((i) => i.done).length;
  return (
    <Card className={compact ? "border-0 p-0 shadow-none" : "p-5 sm:p-6"}>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Profile completeness</h2>
        <span className="text-sm text-muted">{Math.round((done / items.length) * 100)}% complete</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-canvas"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${(done / items.length) * 100}%` }} /></div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i.key} className="flex items-center gap-2 text-sm">
            {i.done ? <CheckCircle2 className="size-4 text-emerald-600" aria-hidden /> : <Circle className={i.required ? "size-4 text-danger" : "size-4 text-muted"} aria-hidden />}
            {i.done ? <span>{i.label}</span> : <Link href={i.href} className="text-navy-900 underline decoration-line underline-offset-2 hover:decoration-navy-900">{i.label}</Link>}
            {!i.done && i.required ? <span className="text-xs font-medium text-danger">Required</span> : null}
          </li>
        ))}
      </ul>
      {req.every((r) => r.done) ? null : <p className="mt-3 text-xs text-muted">Complete all required items before submitting.</p>}
    </Card>
  );
}
