import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { ActionForm, CheckboxField, SubmitButton, TextField, TextareaField } from "@/components/form";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { saveSitePageAction } from "../../actions";
import type { SitePage } from "@/lib/types";

export const metadata: Metadata = { title: "Edit page" };

export default async function EditSitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();
  const isNew = id === "new";
  let page: SitePage | null = null;
  if (!isNew) {
    const { data } = await (await createClient()).from("site_pages").select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    page = data as SitePage;
  }
  return (
    <div className="space-y-6">
      <Link href="/admin/pages" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-navy-900"><ArrowLeft className="size-4" aria-hidden /> Pages</Link>
      <PageHeader title={page?.title ?? "New page"} description={page ? <Link href={`/${page.slug}`} target="_blank" className="underline">/{page.slug}</Link> : undefined} />
      <Card className="p-5 sm:p-6">
        <ActionForm action={saveSitePageAction.bind(null, isNew ? null : id)} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="title" label="Title" defaultValue={page?.title} required />
            <TextField name="slug" label="URL slug" defaultValue={page?.slug} required hint="Core pages (privacy, terms, about…) rely on their existing slugs." />
          </div>
          <TextareaField name="summary" label="Summary" optional rows={2} defaultValue={page?.summary} />
          <TextareaField name="content" label="Content (Markdown)" rows={28} defaultValue={page?.content} required className="[&_textarea]:font-mono [&_textarea]:text-sm" />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="seo_title" label="SEO title" optional defaultValue={page?.seo_title} maxLength={70} />
            <TextField name="seo_description" label="SEO description" optional defaultValue={page?.seo_description} maxLength={170} />
          </div>
          <CheckboxField name="is_published" label="Published" defaultChecked={page?.is_published ?? true} />
          <CheckboxField name="show_in_footer" label="Show in footer" defaultChecked={page?.show_in_footer ?? false} />
          <SubmitButton size="lg" pendingText="Saving…">Save page</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
