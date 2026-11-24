import Link from "next/link";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-card";
import { ActionForm, SubmitButton, TextField } from "@/components/form";
import { Alert } from "@/components/ui";
import { loginAction } from "../actions";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthCard
      title="Welcome back"
      description="Log in to manage your saved businesses, enquiries and listings."
      footer={<>New to Findora? <Link href="/register" className="font-semibold text-emerald-700 hover:underline">Create an account</Link></>}
    >
      {sp.error === "link_expired" ? <Alert tone="warning" className="mb-5">That link is invalid or has expired. Log in or request a new link.</Alert> : null}
      <ActionForm action={loginAction} className="space-y-4">
        <input type="hidden" name="next" value={sp.next ?? ""} />
        <TextField name="email" label="Email address" type="email" autoComplete="email" required />
        <TextField name="password" label="Password" type="password" autoComplete="current-password" required />
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm font-medium text-emerald-700 hover:underline">Forgot password?</Link>
        </div>
        <SubmitButton className="w-full" size="lg" pendingText="Logging in…">Log in</SubmitButton>
      </ActionForm>
    </AuthCard>
  );
}
