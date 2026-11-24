import Link from "next/link";
import type { Metadata } from "next";
import { Container, Breadcrumbs, Card, Alert } from "@/components/ui";
import { ActionForm, Honeypot, SelectField, SubmitButton, TextField, TextareaField } from "@/components/form";
import { BusinessLogo } from "@/components/business-card";
import { getBusinessBySlug } from "@/lib/data";
import { REPORT_REASONS } from "@/lib/constants";
import { submitReportAction } from "../actions";

export const metadata: Metadata = {
  title: "Report a business",
  description: "Report suspicious listings, incorrect information, inappropriate photographs or spam on Findora.",
  alternates: { canonical: "/report" },
};

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ business?: string }> }) {
  const { business: slug } = await searchParams;
  const b = slug ? await getBusinessBySlug(slug.slice(0, 120)) : null;
  return (
    <Container className="py-10">
      <Breadcrumbs items={[{ label: "Report a business" }]} />
      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Report a business</h1>
          <p className="mt-3 text-lg text-muted">Help keep Findora trustworthy. Our moderation team reviews every report.</p>
          <div className="mt-6 space-y-3 text-sm leading-relaxed text-ink/85">
            <p><strong className="text-heading">What happens next:</strong> we review the listing, may contact the business, and can correct, hide or remove information that breaks our <Link href="/listing-guidelines" className="text-emerald-700 underline">listing guidelines</Link>.</p>
            <p><strong className="text-heading">Takedown requests:</strong> if a listing contains your personal information without permission, choose “Something else” and explain. We act on valid requests promptly.</p>
            <p><strong className="text-heading">Emergencies:</strong> if you have been the victim of fraud, report it to the South African Police Service as well.</p>
          </div>
        </div>
        <Card className="p-6 sm:p-8">
          {slug && !b ? <Alert tone="warning" className="mb-5">We couldn&apos;t find that listing. It may already have been removed. Use the <Link href="/contact" className="underline">contact form</Link> instead.</Alert> : null}
          {b ? (
            <>
              <div className="mb-6 flex items-center gap-3 rounded-xl bg-canvas p-3">
                <BusinessLogo path={b.logo_path} name={b.name} size={44} />
                <div><p className="text-xs text-muted">Reporting</p><p className="font-semibold text-heading">{b.name}</p></div>
              </div>
              <ActionForm action={submitReportAction} resetOnSuccess className="relative space-y-4">
                <input type="hidden" name="business_id" value={b.id} />
                <Honeypot />
                <SelectField name="reason" label="What's the problem?" placeholder="Choose a reason" options={REPORT_REASONS} required />
                {b.images.length ? (
                  <SelectField name="image_id" label="Which photograph? (if applicable)" optional placeholder="Not about a photo" options={b.images.map((img, i) => ({ value: img.id, label: img.alt_text || `Photo ${i + 1}` }))} />
                ) : null}
                <TextareaField name="details" label="Details" rows={5} required maxLength={2000} hint="Tell us what's wrong. Include links or evidence if you can." />
                <TextField name="reporter_email" label="Your email" type="email" optional hint="So we can follow up. Not shared with the business." />
                <SubmitButton size="lg" pendingText="Submitting…">Submit report</SubmitButton>
              </ActionForm>
            </>
          ) : !slug ? (
            <div className="text-sm text-ink/85">
              <p>To report a listing, open the business profile and choose <strong>“Report this listing”</strong> at the bottom of the contact panel. This makes sure your report is linked to the right business.</p>
              <p className="mt-3">For other concerns, use the <Link href="/contact" className="font-semibold text-emerald-700 underline">contact form</Link>.</p>
            </div>
          ) : null}
        </Card>
      </div>
    </Container>
  );
}
