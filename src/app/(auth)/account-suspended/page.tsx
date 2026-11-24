import Link from "next/link";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-card";
import { signOutAction } from "../actions";
import { Button } from "@/components/ui";

export const metadata: Metadata = { title: "Account suspended" };

export default function SuspendedPage() {
  return (
    <AuthCard title="Your account is suspended" description="Access to your dashboard has been restricted by a Findora administrator.">
      <p className="text-sm text-ink/85">
        If you believe this is a mistake or want to provide more information, please <Link href="/contact" className="font-semibold text-emerald-700 underline">contact us</Link>.
      </p>
      <form action={signOutAction} className="mt-6">
        <Button variant="outline" type="submit">Sign out</Button>
      </form>
    </AuthCard>
  );
}
