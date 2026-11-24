import type { Metadata } from "next";
import { Card, PageHeader, Alert } from "@/components/ui";
import { WizardProgress } from "@/components/wizard-steps";
import { BusinessInfoForm } from "@/components/business-forms";
import { requireUser } from "@/lib/auth";
import { getCategories, getSettings } from "@/lib/data";
import { createBusinessAction } from "../actions";

export const metadata: Metadata = { title: "Add a business" };

export default async function NewBusinessPage() {
  await requireUser("/dashboard/businesses/new");
  const [categories, settings] = await Promise.all([getCategories(), getSettings()]);
  return (
    <div className="space-y-6">
      <WizardProgress current="business" />
      <PageHeader title="Tell us about your business" description="Step 2 of 8 — your progress is saved after every step, so you can finish later." />
      {!settings.business_registration_open ? (
        <Alert tone="warning">New business listings are temporarily paused. Please check back soon.</Alert>
      ) : (
        <Card className="p-5 sm:p-8">
          <BusinessInfoForm action={createBusinessAction} categories={categories} mode="wizard" back="/dashboard/businesses" />
        </Card>
      )}
    </div>
  );
}
