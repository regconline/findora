import Link from "next/link";
import { ActionForm, CheckboxField, SelectField, SubmitButton, TextField, TextareaField } from "@/components/form";
import { CategoryPicker } from "@/components/category-picker";
import { BUSINESS_TYPES, DAYS, PRICE_TYPES, PROVINCES } from "@/lib/constants";
import { formatPhone } from "@/lib/utils";
import type { ActionState, Business, BusinessHour, BusinessLocation, Category, Service } from "@/lib/types";

type Action = (s: ActionState, fd: FormData) => Promise<ActionState>;
type Mode = "wizard" | "edit";

function Footer({ mode, back, label }: { mode: Mode; back?: string; label?: string }) {
  return (
    <div className="mt-8 flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
      {back ? <Link href={back} className="text-center text-sm font-medium text-muted hover:text-navy-900">← Back</Link> : <span />}
      <SubmitButton size="lg" pendingText="Saving…">{label ?? (mode === "wizard" ? "Save and continue" : "Save changes")}</SubmitButton>
    </div>
  );
}

export function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-1 text-base font-semibold text-navy-900">{title}</legend>
      {description ? <p className="-mt-2 text-sm text-muted">{description}</p> : null}
      {children}
    </fieldset>
  );
}

export function BusinessInfoForm({ action, categories, business, mode, back }: { action: Action; categories: Category[]; business?: Business | null; mode: Mode; back?: string }) {
  return (
    <ActionForm action={action} className="space-y-8">
      <input type="hidden" name="_mode" value={mode} />
      <Section title="About your business" description="This appears at the top of your public profile.">
        <TextField name="name" label="Business name" defaultValue={business?.name} required maxLength={120} />
        <TextField name="tagline" label="Short tagline" optional defaultValue={business?.tagline} maxLength={160} hint="One line that sums up what you do, e.g. “Family dental practice in Klerksdorp since 2004”." />
        <TextareaField name="description" label="Business description" defaultValue={business?.description} rows={7} maxLength={5000} required hint="At least 40 characters. Describe what you do, who you serve and what makes you different." />
      </Section>
      <Section title="Category">
        <CategoryPicker categories={categories} categoryId={business?.category_id} subcategoryId={business?.subcategory_id} />
      </Section>
      <Section title="Business profile">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField name="business_type" label="Business type" defaultValue={business?.business_type ?? "sole_proprietor"} options={BUSINESS_TYPES} />
          <TextField name="year_established" label="Year established" optional type="number" inputMode="numeric" min={1800} max={new Date().getFullYear()} defaultValue={business?.year_established} />
          <TextField name="registration_number" label="Business registration number" optional defaultValue={business?.registration_number} hint="CIPC number, e.g. 2015/123456/07. Only shown publicly if you choose." />
          <TextField name="website" label="Business website" optional type="url" inputMode="url" defaultValue={business?.website} placeholder="www.example.co.za" />
        </div>
        <CheckboxField name="show_registration_number" label="Show my registration number on my public profile" defaultChecked={business?.show_registration_number} />
      </Section>
      <Footer mode={mode} back={back} label={mode === "wizard" && !business ? "Create listing and continue" : undefined} />
    </ActionForm>
  );
}

export function LocationForm({ action, location, mode, back }: { action: Action; location?: BusinessLocation | null; mode: Mode; back?: string }) {
  return (
    <ActionForm action={action} className="space-y-8">
      <input type="hidden" name="_mode" value={mode} />
      <Section title="Where are you based?" description="Customers search by province and town. Your street address is optional.">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField name="province" label="Province" defaultValue={location?.province} placeholder="Select a province" options={PROVINCES.map((p) => ({ value: p, label: p }))} required />
          <TextField name="city" label="City" defaultValue={location?.city} required placeholder="e.g. Klerksdorp" />
          <TextField name="town" label="Town" optional defaultValue={location?.town} />
          <TextField name="suburb" label="Suburb" optional defaultValue={location?.suburb} />
          <TextField name="street_address" label="Street address" optional defaultValue={location?.street_address} className="sm:col-span-2" />
          <TextField name="postal_code" label="Postal code" optional inputMode="numeric" maxLength={4} defaultValue={location?.postal_code} />
        </div>
        <CheckboxField name="show_street_address" label="Show my street address publicly" description="Untick this if you work from home or only visit customers." defaultChecked={location ? location.show_street_address : true} />
      </Section>
      <Section title="Service areas" description="Other towns or suburbs you serve. Separate with commas.">
        <TextField name="service_areas" label="Areas served" optional defaultValue={location?.service_areas?.join(", ")} placeholder="e.g. Potchefstroom, Orkney, Stilfontein" />
      </Section>
      <Section title="Map coordinates" description="Optional. Used for the “Get directions” button. In Google Maps, right-click your location to copy the coordinates.">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="latitude" label="Latitude" optional inputMode="decimal" defaultValue={location?.latitude} placeholder="-26.8521" />
          <TextField name="longitude" label="Longitude" optional inputMode="decimal" defaultValue={location?.longitude} placeholder="26.6667" />
        </div>
      </Section>
      <Footer mode={mode} back={back} />
    </ActionForm>
  );
}

export function ContactForm({ action, business, hours, mode, back }: { action: Action; business: Business; hours: BusinessHour[]; mode: Mode; back?: string }) {
  const byDay = new Map(hours.map((h) => [h.day_of_week, h]));
  return (
    <ActionForm action={action} className="space-y-8">
      <input type="hidden" name="_mode" value={mode} />
      <Section title="How can customers reach you?" description="Add at least one. These details are shown on your public profile.">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="phone" label="Business telephone" optional type="tel" defaultValue={formatPhone(business.phone)} placeholder="018 123 4567" />
          <TextField name="whatsapp" label="WhatsApp number" optional type="tel" defaultValue={formatPhone(business.whatsapp)} placeholder="082 123 4567" />
          <TextField name="email" label="Business email" optional type="email" defaultValue={business.email} />
          <TextField name="website" label="Website" optional type="url" defaultValue={business.website} />
        </div>
      </Section>
      <Section title="Social media" description="Full links to your pages.">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="facebook_url" label="Facebook" optional defaultValue={business.facebook_url} placeholder="facebook.com/yourbusiness" />
          <TextField name="instagram_url" label="Instagram" optional defaultValue={business.instagram_url} placeholder="instagram.com/yourbusiness" />
          <TextField name="tiktok_url" label="TikTok" optional defaultValue={business.tiktok_url} placeholder="tiktok.com/@yourbusiness" />
          <TextField name="linkedin_url" label="LinkedIn" optional defaultValue={business.linkedin_url} placeholder="linkedin.com/company/yourbusiness" />
        </div>
      </Section>
      <Section title="Operating hours" description="Leave a day blank if you don't want to show hours for it.">
        <div className="overflow-hidden rounded-xl border border-line">
          {DAYS.map((day, i) => {
            const h = byDay.get(i);
            return (
              <div key={day} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 border-b border-line px-4 py-3 last:border-b-0 sm:grid-cols-[120px_1fr_1fr_auto]">
                <span className="text-sm font-medium">{day}</span>
                <label className="flex items-center gap-2 text-sm text-muted sm:order-last">
                  <input type="checkbox" name={`closed_${i}`} defaultChecked={h?.is_closed} className="size-4 accent-emerald-600" /> Closed
                </label>
                <label className="text-xs text-muted">Opens
                  <input type="time" name={`opens_${i}`} defaultValue={h?.opens_at?.slice(0, 5) ?? ""} className="mt-1 block h-10 w-full rounded-lg border border-line px-2 text-sm text-ink" />
                </label>
                <label className="text-xs text-muted">Closes
                  <input type="time" name={`closes_${i}`} defaultValue={h?.closes_at?.slice(0, 5) ?? ""} className="mt-1 block h-10 w-full rounded-lg border border-line px-2 text-sm text-ink" />
                </label>
              </div>
            );
          })}
        </div>
      </Section>
      <CheckboxField
        name="contact_publish_consent"
        defaultChecked={business.contact_publish_consent}
        label="I confirm that I am authorised to publish these contact details and consent to them being shown publicly on Findora."
        description="Required by the Protection of Personal Information Act (POPIA). You can edit or remove them at any time."
      />
      <Footer mode={mode} back={back} />
    </ActionForm>
  );
}

export function ServiceForm({ action, service, categories, submitLabel }: { action: Action; service?: Service | null; categories: Category[]; submitLabel?: string }) {
  return (
    <ActionForm action={action} className="space-y-4" resetOnSuccess={!service} encType="multipart/form-data">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="name" label="Service name" defaultValue={service?.name} required maxLength={120} className="sm:col-span-2" />
        <TextareaField name="description" label="Description" optional rows={3} defaultValue={service?.description} maxLength={2000} className="sm:col-span-2" />
        <SelectField
          name="subcategory_id"
          label="Service category"
          optional
          defaultValue={service?.subcategory_id}
          placeholder="Select a category"
          options={categories.map((c) => ({ group: c.name, options: (c.subcategories ?? []).map((s) => ({ value: s.id, label: s.name })) }))}
        />
        <TextField name="availability" label="Availability" optional defaultValue={service?.availability} placeholder="e.g. Weekdays, by appointment" maxLength={200} />
        <SelectField name="price_type" label="Price type" defaultValue={service?.price_type ?? "quote"} options={PRICE_TYPES} />
        <TextField name="price" label="Price (R)" optional type="number" inputMode="decimal" min={0} step="0.01" defaultValue={service?.price} hint="Leave blank for quotation-only or free services." />
        <div className="space-y-1.5 sm:col-span-2">
          <label className="block text-sm font-medium text-navy-900" htmlFor={`svc-img-${service?.id ?? "new"}`}>Service image <span className="font-normal text-muted">(optional)</span></label>
          <input id={`svc-img-${service?.id ?? "new"}`} type="file" name="image" accept="image/jpeg,image/png,image/webp" className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-navy-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white" />
          <p className="text-[13px] text-muted">JPG, PNG or WebP, up to 4 MB.</p>
        </div>
      </div>
      <SubmitButton pendingText="Saving…">{submitLabel ?? (service ? "Save service" : "Add service")}</SubmitButton>
    </ActionForm>
  );
}
