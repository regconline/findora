import Link from "next/link";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-card";
import { ActionForm, SubmitButton, TextField } from "@/components/form";
import { Alert } from "@/components/ui";
import { getUser } from "@/lib/auth";
import { resetPasswordAction } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  const user = await getUser();
  return (
    <AuthCard title="Choose a new password" description="Use at least 10 characters, including a letter and a number.">
      {!user ? (
        <Alert tone="warning">
          Your reset link has expired or was already used. <Link href="/forgot-password" className="font-semibold underline">Request a new link</Link>.
        </Alert>
      ) : (
        <ActionForm action={resetPasswordAction} className="space-y-4">
          <TextField name="password" label="New password" type="password" autoComplete="new-password" required />
          <TextField name="confirm_password" label="Confirm new password" type="password" autoComplete="new-password" required />
          <SubmitButton className="w-full" size="lg" pendingText="Saving…">Update password</SubmitButton>
        </ActionForm>
      )}
    </AuthCard>
  );
}
