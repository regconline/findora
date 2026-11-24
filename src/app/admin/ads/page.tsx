import Link from "next/link";
import type { Metadata } from "next";
import { Alert, Card, CardHeader, PageHeader, StatusBadge } from "@/components/ui";
import { ActionForm, CheckboxField, ConfirmButton, SelectField, SubmitButton, TextField } from "@/components/form";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data";
import { env } from "@/lib/env";
import { AD_PLACEMENTS } from "@/lib/constants";
import { deleteAdAction, saveAdAction } from "../actions";

export const metadata: Metadata = { title: "Advertising" };

type Ad = { id: string; name: string; placement: string; provider: string; adsense_slot: string | null; image_url: string | null; link_url: string | null; alt_text: string | null; is_active: boolean; starts_at: string | null; ends_at: string | null };

function AdFields({ a }: { a?: Ad }) {
  return (
    <>
      <TextField name="name" label="Internal name" defaultValue={a?.name} required />
      <SelectField name="placement" label="Placement" defaultValue={a?.placement ?? "home_mid"} options={AD_PLACEMENTS} />
      <SelectField name="provider" label="Provider" defaultValue={a?.provider ?? "adsense"} options={[{ value: "adsense", label: "Google AdSense" }, { value: "direct", label: "Direct campaign (image + link)" }]} />
      <TextField name="adsense_slot" label="AdSense ad slot ID" optional defaultValue={a?.adsense_slot} hint="Numeric data-ad-slot from AdSense." />
      <TextField name="image_url" label="Image URL (direct)" optional defaultValue={a?.image_url} />
      <TextField name="link_url" label="Link URL (direct)" optional defaultValue={a?.link_url} />
      <TextField name="alt_text" label="Image alt text" optional defaultValue={a?.alt_text} />
      <TextField name="starts_at" label="Starts" optional type="date" defaultValue={a?.starts_at?.slice(0, 10)} />
      <TextField name="ends_at" label="Ends" optional type="date" defaultValue={a?.ends_at?.slice(0, 10)} />
      <CheckboxField name="is_active" label="Active (one per placement)" defaultChecked={a?.is_active} className="pt-7" />
    </>
  );
}

export default async function AdminAds() {
  await requireAdmin();
  const [{ data }, settings] = await Promise.all([(await createClient()).from("advertisements").select("*").order("placement"), getSettings()]);
  const ads = (data as Ad[]) ?? [];
  const configured = env.adsenseEnabled && Boolean(env.adsenseClientId);
  return (
    <div className="space-y-6">
      <PageHeader title="Advertising" description="Ads are clearly labelled and never shown on login, registration, dashboard or enquiry screens." />
      <Card className="p-5">
        <h2 className="font-semibold">Status</h2>
        <ul className="mt-3 space-y-1.5 text-sm">
          <li>AdSense environment configuration: {configured ? <strong className="text-emerald-700">configured</strong> : <strong className="text-danger">not configured</strong>} <span className="text-muted">(NEXT_PUBLIC_ADSENSE_ENABLED, NEXT_PUBLIC_ADSENSE_CLIENT_ID)</span></li>
          <li>Platform ads switch: {settings.ads_enabled ? <strong className="text-emerald-700">ON</strong> : <strong>OFF</strong>} — change in <Link href="/admin/settings" className="text-emerald-700 underline">platform settings</Link></li>
          <li>ads.txt: <a href="/ads.txt" target="_blank" className="text-emerald-700 underline">/ads.txt</a> {configured ? "" : "(returns 404 until a publisher ID is set)"}</li>
        </ul>
        {!settings.ads_enabled ? <Alert tone="info" className="mt-4">Advertising is switched off. Enable it only after your AdSense account and domain are approved.</Alert> : null}
      </Card>
      <Card>
        <CardHeader title="Placements" />
        <ul className="divide-y divide-line">
          {ads.map((a) => (
            <li key={a.id} className="px-5 py-4 sm:px-6">
              <details>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                  <span><span className="font-medium text-navy-900">{a.name}</span> <span className="text-sm text-muted">· {AD_PLACEMENTS.find((p) => p.value === a.placement)?.label} · {a.provider}</span></span>
                  <StatusBadge status={a.is_active ? "active" : "archived"} />
                </summary>
                <ActionForm action={saveAdAction.bind(null, a.id)} className="mt-4 grid gap-4 sm:grid-cols-3">
                  <AdFields a={a} />
                  <div className="sm:col-span-3"><SubmitButton size="sm">Save</SubmitButton></div>
                </ActionForm>
                <form action={deleteAdAction.bind(null, a.id)} className="mt-2"><ConfirmButton variant="danger-outline" confirm="Delete this placement?">Delete</ConfirmButton></form>
              </details>
            </li>
          ))}
          {!ads.length ? <li className="px-6 py-6 text-sm text-muted">No placements configured yet.</li> : null}
        </ul>
      </Card>
      <Card>
        <CardHeader title="Add a placement" />
        <ActionForm action={saveAdAction.bind(null, null)} resetOnSuccess className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
          <AdFields />
          <div className="sm:col-span-3"><SubmitButton>Add placement</SubmitButton></div>
        </ActionForm>
      </Card>
    </div>
  );
}
