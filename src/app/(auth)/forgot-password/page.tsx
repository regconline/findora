import Link from "next/link";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-card";
import { ActionForm, SubmitButton, TextField } from "@/components/form";
import { forgotPasswordAction } from "../actions";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      description="Enter the email address you registered with and we'll send you a secure reset link."
      footer={<Link href="/login" className="font-semibold text-emerald-700 hover:underline">Back to log in</Link>}
    >
      <ActionForm action={forgotPasswordAction} className="space-y-4">
        <TextField name="email" label="Email address" type="email" autoComplete="email" required />
        <SubmitButton className="w-full" size="lg" pendingText="Sending…">Send reset link</SubmitButton>
      </ActionForm>
    </AuthCard>
  );
}
