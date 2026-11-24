import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { Card, CardHeader, PageHeader, StatusBadge } from "@/components/ui";
import { ActionForm, CheckboxField, ConfirmButton, SelectField, SubmitButton, TextField, TextareaField } from "@/components/form";
import { CATEGORY_ICON_NAMES } from "@/components/category-icon";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteCategoryAction, deleteSubcategoryAction, saveCategoryAction, saveSubcategoryAction } from "../../actions";

export const metadata: Metadata = { title: "Edit category" };

export default async function AdminCategory({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();
  const supabase = await createClient();
  const { data: c } = await supabase.from("categories").select("*, subcategories(*)").eq("id", id).order("sort_order", { referencedTable: "subcategories" }).maybeSingle();
  if (!c) notFound();
  const subs = (c.subcategories as { id: string; name: string; slug: string; description: string | null; sort_order: number; is_active: boolean }[]) ?? [];
  return (
    <div className="space-y-6">
      <Link href="/admin/categories" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-navy-900"><ArrowLeft className="size-4" aria-hidden /> Categories</Link>
      <PageHeader title={c.name} description={`/categories/${c.slug}`} />
      <Card>
        <CardHeader title="Category details" />
        <ActionForm action={saveCategoryAction.bind(null, id)} className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <TextField name="name" label="Name" defaultValue={c.name} />
          <TextField name="slug" label="Slug" defaultValue={c.slug} hint="Changing the slug changes public URLs." />
          <SelectField name="icon" label="Icon" defaultValue={c.icon} options={CATEGORY_ICON_NAMES.map((n) => ({ value: n, label: n }))} />
          <TextField name="sort_order" label="Sort order" type="number" defaultValue={c.sort_order} />
          <TextareaField name="description" label="Description" optional rows={2} defaultValue={c.description} className="sm:col-span-2" />
          <TextField name="seo_title" label="SEO title" optional defaultValue={c.seo_title} maxLength={70} />
          <TextField name="seo_description" label="SEO description" optional defaultValue={c.seo_description} maxLength={170} />
          <CheckboxField name="is_active" label="Active (visible to the public)" defaultChecked={c.is_active} className="sm:col-span-2" />
          <div className="sm:col-span-2"><SubmitButton>Save category</SubmitButton></div>
        </ActionForm>
      </Card>
      <Card>
        <CardHeader title={`Subcategories (${subs.length})`} description="Also used as service categories when businesses add services." />
        <ul className="divide-y divide-line">
          {subs.map((s) => (
            <li key={s.id} className="px-5 py-4 sm:px-6">
              <details>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                  <span className="font-medium text-navy-900">{s.name} <span className="text-sm font-normal text-muted">/{s.slug}</span></span>
                  <StatusBadge status={s.is_active ? "active" : "archived"} />
                </summary>
                <ActionForm action={saveSubcategoryAction.bind(null, id, s.id)} className="mt-4 grid gap-4 sm:grid-cols-3">
                  <TextField name="name" label="Name" defaultValue={s.name} />
                  <TextField name="slug" label="Slug" defaultValue={s.slug} />
                  <TextField name="sort_order" label="Sort order" type="number" defaultValue={s.sort_order} />
                  <TextareaField name="description" label="Description" optional rows={2} defaultValue={s.description} className="sm:col-span-3" />
                  <CheckboxField name="is_active" label="Active" defaultChecked={s.is_active} />
                  <div className="flex gap-2 sm:col-span-3"><SubmitButton size="sm">Save</SubmitButton></div>
                </ActionForm>
                <form action={deleteSubcategoryAction.bind(null, s.id, id)} className="mt-2"><ConfirmButton variant="danger-outline" confirm={`Delete ${s.name}? If businesses use it, it will be deactivated instead.`}>Delete</ConfirmButton></form>
              </details>
            </li>
          ))}
        </ul>
        <ActionForm action={saveSubcategoryAction.bind(null, id, null)} resetOnSuccess className="grid gap-4 border-t border-line p-5 sm:grid-cols-4 sm:p-6">
          <TextField name="name" label="New subcategory" required />
          <TextField name="slug" label="Slug" required />
          <TextField name="sort_order" label="Sort order" type="number" defaultValue={(subs.length + 1) * 10} />
          <input type="hidden" name="is_active" value="on" />
          <div className="flex items-end"><SubmitButton>Add</SubmitButton></div>
        </ActionForm>
      </Card>
      <Card className="border-danger/30 p-5">
        <form action={deleteCategoryAction.bind(null, id)} className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">Deleting a category used by businesses deactivates it instead, so no listings are orphaned.</p>
          <ConfirmButton variant="danger-outline" size="md" confirm={`Delete or deactivate ${c.name}?`}>Delete category</ConfirmButton>
        </form>
      </Card>
    </div>
  );
}
