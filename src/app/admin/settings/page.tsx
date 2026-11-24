import type { Metadata } from "next";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { ActionForm, CheckboxField, SubmitButton, TextField, TextareaField } from "@/components/form";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { saveSettingsAction } from "../actions";

export const metadata: Metadata = { title: "Platform settings" };

export default async function AdminSettings() {
  await requireAdmin();
  const s = await getSettings();
  return (
    <div className="space-y-6">
      <PageHeader title="Platform settings" description="Website details, social links, SEO defaults, registration and advertising switches." />
      <ActionForm action={saveSettingsAction} className="space-y-6">
        <Card>
          <CardHeader title="Website details" description="The logo files live in /public/brand — replace them there to update branding." />
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <TextField name="site_name" label="Site name" defaultValue={s.site_name} />
            <TextField name="contact_email" label="Contact email" type="email" defaultValue={s.contact_email} />
            <TextField name="privacy_email" label="Privacy / information officer email" type="email" defaultValue={s.privacy_email} />
            <TextField name="contact_phone" label="Contact phone" optional defaultValue={s.contact_phone} />
            <TextareaField name="physical_address" label="Physical address" optional rows={2} defaultValue={s.physical_address} className="sm:col-span-2" />
            <TextField name="announcement" label="Site announcement" optional defaultValue={s.announcement} className="sm:col-span-2" hint="Short notice shown at the top of public pages. Leave empty to hide." />
          </div>
        </Card>
        <Card>
          <CardHeader title="Social links" description="Full https:// URLs. Leave blank to hide." />
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <TextField name="facebook" label="Facebook" optional defaultValue={s.social?.facebook} />
            <TextField name="instagram" label="Instagram" optional defaultValue={s.social?.instagram} />
            <TextField name="linkedin" label="LinkedIn" optional defaultValue={s.social?.linkedin} />
            <TextField name="tiktok" label="TikTok" optional defaultValue={s.social?.tiktok} />
          </div>
        </Card>
        <Card>
          <CardHeader title="SEO defaults" />
          <div className="grid gap-4 p-5 sm:p-6">
            <TextField name="seo_default_title" label="Default title" defaultValue={s.seo_default_title} maxLength={70} />
            <TextareaField name="seo_default_description" label="Default description" rows={2} defaultValue={s.seo_default_description} maxLength={170} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Registration & advertising" />
          <div className="space-y-4 p-5 sm:p-6">
            <CheckboxField name="registration_open" label="Allow new account registrations" defaultChecked={s.registration_open} />
            <CheckboxField name="business_registration_open" label="Allow new business listings" defaultChecked={s.business_registration_open} />
            <CheckboxField name="ads_enabled" label="Show advertisements" description="Requires AdSense environment variables and an approved account. Turn on only after approval." defaultChecked={s.ads_enabled} />
          </div>
        </Card>
        <SubmitButton size="lg" pendingText="Saving…">Save settings</SubmitButton>
      </ActionForm>
    </div>
  );
}
