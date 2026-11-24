import Link from "next/link";
import type { Metadata } from "next";
import { User, Store, ArrowRight } from "lucide-react";
import { AuthCard } from "@/components/auth-card";
import { RegisterForm } from "@/components/register-form";

export const metadata: Metadata = { title: "Create an account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  if (type === "customer") {
    return (
      <AuthCard
        wide
        title="Create your customer account"
        description="Save businesses, send enquiries and keep track of your conversations. You can browse Findora without an account."
        footer={<>Already registered? <Link href="/login" className="font-semibold text-emerald-700 hover:underline">Log in</Link></>}
      >
        <RegisterForm accountType="customer" />
      </AuthCard>
    );
  }
  return (
    <AuthCard
      wide
      title="Join Findora"
      description="Choose the account that fits you. Both are free."
      footer={<>Already registered? <Link href="/login" className="font-semibold text-emerald-700 hover:underline">Log in</Link></>}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { href: "/register?type=customer", icon: User, title: "I'm looking for businesses", text: "Save favourites, send enquiries and track replies." },
          { href: "/register/business", icon: Store, title: "I own a business", text: "Create a free listing and receive customer enquiries." },
        ].map((o) => (
          <Link key={o.href} href={o.href} className="group flex flex-col rounded-xl border border-line p-5 transition-colors hover:border-emerald-500">
            <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><o.icon className="size-5" aria-hidden /></span>
            <span className="mt-4 font-semibold text-navy-900">{o.title}</span>
            <span className="mt-1 flex-1 text-sm text-muted">{o.text}</span>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">Continue <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden /></span>
          </Link>
        ))}
      </div>
    </AuthCard>
  );
}
