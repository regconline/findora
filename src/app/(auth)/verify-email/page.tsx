import Link from "next/link";
import type { Metadata } from "next";
import { MailCheck } from "lucide-react";
import { AuthCard } from "@/components/auth-card";
import { ActionForm, SubmitButton, TextField } from "@/components/form";
import { resendVerificationAction } from "../actions";

export const metadata: Metadata = { title: "Verify your email" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <AuthCard title="Check your inbox" footer={<Link href="/login" className="font-semibold text-emerald-700 hover:underline">Back to log in</Link>}>
      <div className="flex gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700"><MailCheck className="size-6" aria-hidden /></span>
        <p className="text-sm leading-relaxed text-ink/85">
          We sent a verification link to {email ? <strong>{email}</strong> : "your email address"}. Click the link to activate your account. It may take a minute to arrive — check your spam folder too.
        </p>
      </div>
      <hr className="my-6 border-line" />
      <p className="mb-3 text-sm font-medium">Didn&apos;t receive it?</p>
      <ActionForm action={resendVerificationAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <TextField name="email" label="Email address" type="email" defaultValue={email} className="flex-1" />
        <SubmitButton variant="outline" pendingText="Sending…">Resend link</SubmitButton>
      </ActionForm>
    </AuthCard>
  );
}
