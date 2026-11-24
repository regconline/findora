import type { Metadata } from "next";
import { Card, CardHeader, PageHeader, StatusBadge } from "@/components/ui";
import { ActionForm, CheckboxField, ConfirmButton, SelectField, SubmitButton, TextField, TextareaField } from "@/components/form";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteFaqAction, saveFaqAction } from "../actions";
import type { Faq } from "@/lib/types";

export const metadata: Metadata = { title: "FAQs" };
const AUDIENCES = [{ value: "general", label: "General" }, { value: "customers", label: "Customers" }, { value: "businesses", label: "Businesses" }];

function FaqFields({ f }: { f?: Faq }) {
  return (
    <>
      <TextField name="question" label="Question" defaultValue={f?.question} required className="sm:col-span-3" />
      <TextareaField name="answer" label="Answer (Markdown)" rows={4} defaultValue={f?.answer} required className="sm:col-span-3" />
      <SelectField name="audience" label="Audience" defaultValue={f?.audience ?? "general"} options={AUDIENCES} />
      <TextField name="sort_order" label="Sort order" type="number" defaultValue={f?.sort_order ?? 100} />
      <div className="space-y-2 pt-6">
        <CheckboxField name="is_published" label="Published" defaultChecked={f?.is_published ?? true} />
        <CheckboxField name="show_on_home" label="Show on homepage" defaultChecked={f?.show_on_home} />
      </div>
    </>
  );
}

export default async function AdminFaqs() {
  await requireAdmin();
  const { data } = await (await createClient()).from("faqs").select("*").order("audience").order("sort_order");
  const faqs = (data as Faq[]) ?? [];
  return (
    <div className="space-y-6">
      <PageHeader title="FAQs" description="Shown on the FAQ page, Help Centre, homepage and business pages." />
      <Card>
        <ul className="divide-y divide-line">
          {faqs.map((f) => (
            <li key={f.id} className="px-5 py-4 sm:px-6">
              <details>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                  <span className="font-medium text-heading">{f.question}</span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-muted">{f.audience}{f.show_on_home ? " · home" : ""} <StatusBadge status={f.is_published ? "published" : "draft"} /></span>
                </summary>
                <ActionForm action={saveFaqAction.bind(null, f.id)} className="mt-4 grid gap-4 sm:grid-cols-3">
                  <FaqFields f={f} />
                  <div className="sm:col-span-3"><SubmitButton size="sm">Save</SubmitButton></div>
                </ActionForm>
                <form action={deleteFaqAction.bind(null, f.id)} className="mt-2"><ConfirmButton variant="danger-outline" confirm="Delete this FAQ?">Delete</ConfirmButton></form>
              </details>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <CardHeader title="Add an FAQ" />
        <ActionForm action={saveFaqAction.bind(null, null)} resetOnSuccess className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
          <FaqFields />
          <div className="sm:col-span-3"><SubmitButton>Add FAQ</SubmitButton></div>
        </ActionForm>
      </Card>
    </div>
  );
}
