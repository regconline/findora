"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ActionForm, CheckboxField, Honeypot, SubmitButton, TextField, TextareaField, SelectField, useFormState } from "@/components/form";
import { getBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import { submitEnquiryAction } from "@/app/(public)/actions";

type Me = { name: string; email: string; phone: string } | null;

export function EnquiryForm({ businessId, businessName, services, turnstile }: { businessId: string; businessName: string; services: { id: string; name: string }[]; turnstile?: React.ReactNode }) {
  const [me, setMe] = useState<Me | undefined>(isSupabaseConfigured ? undefined : null);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const sb = getBrowserClient();
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) return setMe(null);
      const { data: p } = await sb.from("profiles").select("full_name, email, phone").eq("id", data.user.id).maybeSingle();
      setMe({ name: p?.full_name ?? "", email: p?.email ?? data.user.email ?? "", phone: p?.phone ?? "" });
    });
  }, []);

  return (
    <ActionForm action={submitEnquiryAction} className="relative space-y-4" resetOnSuccess>
      <input type="hidden" name="business_id" value={businessId} />
      <Honeypot />
      <Fields me={me} businessName={businessName} services={services} />
      {turnstile}
      <SubmitButton className="w-full" size="lg" pendingText="Sending…">Send enquiry</SubmitButton>
      <p className="text-center text-xs text-muted">
        Your details are shared only with {businessName}. See our <Link href="/privacy" className="underline">privacy policy</Link>.
      </p>
    </ActionForm>
  );
}

function Fields({ me, businessName, services }: { me: Me | undefined; businessName: string; services: { id: string; name: string }[] }) {
  const state = useFormState();
  const [createAccount, setCreateAccount] = useState(false);
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField key={`n-${me?.name}`} name="name" label="Your name" autoComplete="name" defaultValue={me?.name} required />
        <TextField key={`e-${me?.email}`} name="email" label="Email" type="email" autoComplete="email" defaultValue={me?.email} required />
        <TextField key={`p-${me?.phone}`} name="phone" label="Phone" type="tel" autoComplete="tel" optional defaultValue={me?.phone} />
        {services.length ? (
          <SelectField name="service_id" label="Service" optional placeholder="General enquiry" options={services.map((s) => ({ value: s.id, label: s.name }))} />
        ) : null}
      </div>
      <TextField name="subject" label="Subject" required maxLength={150} placeholder="e.g. Request for a quote" />
      <TextareaField name="message" label="Message" required rows={5} maxLength={4000} placeholder={`Describe what you need from ${businessName}…`} />
      <CheckboxField name="consent" label={`I agree that Findora may share my enquiry and contact details with ${businessName} so they can respond.`} />
      {me === null ? (
        <div className="rounded-xl bg-canvas p-4">
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="create_account" checked={createAccount} onChange={(e) => setCreateAccount(e.target.checked)} className="mt-0.5 size-[18px] accent-emerald-600" />
            <span>
              <span className="font-medium text-heading">Create a free account to track this enquiry</span>
              <span className="block text-[13px] text-muted">Optional. Save businesses and see your enquiry history. You accept the <Link href="/terms" className="underline">terms</Link>.</span>
            </span>
          </label>
          {createAccount || state.fieldErrors?.password ? (
            <TextField name="password" label="Choose a password" type="password" autoComplete="new-password" hint="At least 10 characters with a letter and a number." className="mt-3" />
          ) : null}
        </div>
      ) : null}
    </>
  );
}
