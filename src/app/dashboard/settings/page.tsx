import type { Metadata } from "next";
import { Download } from "lucide-react";
import { Card, CardHeader, Avatar } from "@/components/ui";
import { ActionForm, CheckboxField, ConfirmButton, SelectField, SubmitButton, TextField, TextareaField } from "@/components/form";
import { ImageUpload } from "@/components/image-upload";
import { ThemeToggle } from "@/components/theme";
import { requireUser } from "@/lib/auth";
import { BUCKETS, PROVINCES } from "@/lib/constants";
import { formatDate, formatPhone, storageUrl } from "@/lib/utils";
import { changePasswordAction, deleteAccountAction, removeAvatarAction, updateProfileAction, uploadAvatarAction } from "./actions";

export const metadata: Metadata = { title: "Account settings" };

export default async function SettingsPage() {
  const { profile } = await requireUser("/dashboard/settings");
  const avatar = storageUrl(BUCKETS.avatars, profile.avatar_path);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Account settings</h1>
        <p className="mt-1 text-muted">Member since {formatDate(profile.created_at)} · {profile.email}</p>
      </div>

      <Card>
        <CardHeader title="Personal information" description="Your contact details are private and never shown on business listings." />
        <div className="grid gap-8 p-5 sm:p-6 md:grid-cols-[180px_1fr]">
          <div className="space-y-3">
            <Avatar src={avatar} name={profile.full_name || "?"} className="size-20 text-lg" />
            <ImageUpload action={uploadAvatarAction} label="Profile photo" />
            {avatar ? <form action={removeAvatarAction}><ConfirmButton variant="ghost" confirm="Remove your profile photo?">Remove photo</ConfirmButton></form> : null}
          </div>
          <ActionForm action={updateProfileAction} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="full_name" label="Full name" defaultValue={profile.full_name} required />
              <TextField name="phone" label="Phone" type="tel" optional defaultValue={formatPhone(profile.phone)} />
              <TextField name="city" label="City or town" optional defaultValue={profile.city} />
              <SelectField name="province" label="Province" optional defaultValue={profile.province} placeholder="Select" options={PROVINCES.map((p) => ({ value: p, label: p }))} />
            </div>
            <TextareaField name="bio" label="About you" optional rows={3} maxLength={500} defaultValue={profile.bio} />
            <CheckboxField name="profile_is_public" defaultChecked={profile.profile_is_public} label="Make my name and bio visible on content I contribute" description="Optional. Your email and phone are never public." />
            <CheckboxField name="marketing_opt_in" defaultChecked={profile.marketing_opt_in} label="Receive occasional Findora news and tips by email" />
            <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
          </ActionForm>
        </div>
      </Card>

      <Card>
        <CardHeader title="Appearance" description="Choose light or dark mode, or follow your device setting." />
        <div className="p-5 sm:p-6"><ThemeToggle full /></div>
      </Card>

      <Card>
        <CardHeader title="Password" />
        <ActionForm action={changePasswordAction} resetOnSuccess className="grid gap-4 p-5 sm:p-6 md:grid-cols-3">
          <TextField name="current_password" label="Current password" type="password" autoComplete="current-password" />
          <TextField name="new_password" label="New password" type="password" autoComplete="new-password" hint="10+ characters, a letter and a number" />
          <TextField name="confirm_password" label="Confirm new password" type="password" autoComplete="new-password" />
          <div className="md:col-span-3"><SubmitButton variant="navy" pendingText="Updating…">Change password</SubmitButton></div>
        </ActionForm>
      </Card>

      <Card>
        <CardHeader title="Your data" description="Under POPIA you may request a copy of your personal information at any time." />
        <div className="p-5 sm:p-6">
          { }
          <a href="/api/account/export" download className="inline-flex h-10 items-center gap-2 rounded-lg border border-line px-4 text-sm font-semibold text-heading hover:bg-canvas">
            <Download className="size-4" aria-hidden /> Download my data (JSON)
          </a>
          <p className="mt-2 text-sm text-muted">Includes your profile, consents, saved businesses, enquiries and listings you manage.</p>
        </div>
      </Card>

      <Card className="border-danger/30">
        <CardHeader title="Delete account" description="Permanently deletes your account and profile. Listings you are the only owner of are removed. This cannot be undone." />
        <ActionForm action={deleteAccountAction} className="grid gap-4 p-5 sm:p-6 md:grid-cols-3">
          <TextField name="password" label="Your password" type="password" autoComplete="current-password" />
          <TextField name="confirm" label="Type DELETE to confirm" autoComplete="off" />
          <div className="flex items-end"><SubmitButton variant="danger" pendingText="Deleting…">Delete my account</SubmitButton></div>
        </ActionForm>
      </Card>
    </div>
  );
}
