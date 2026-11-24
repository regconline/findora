import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-card";
import { RegisterForm } from "@/components/register-form";
import { WizardProgress } from "@/components/wizard-steps";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Register your business" };

export default async function RegisterBusinessPage() {
  if (await getUser()) redirect("/dashboard/businesses/new");
  return (
    <div className="w-full max-w-2xl space-y-6">
      <WizardProgress current="account" />
      <AuthCard
        wide
        title="Create your business account"
        description="Step 1 of 8. Your listing is free. After verifying your email you'll add your business details, services and photos."
        footer={<>Already have an account? <Link href="/login?next=/dashboard/businesses/new" className="font-semibold text-emerald-700 hover:underline">Log in to add a business</Link></>}
      >
        <RegisterForm accountType="business_owner" />
      </AuthCard>
    </div>
  );
}
