import Link from "next/link";
import type { Metadata } from "next";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Card, CardHeader, PageHeader, StatusBadge } from "@/components/ui";
import { ActionForm, ConfirmButton, SubmitButton, TextField } from "@/components/form";
import { Table } from "@/components/admin-table";
import { CategoryIcon } from "@/components/category-icon";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { moveCategoryAction, saveCategoryAction } from "../actions";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategories() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data }, { data: counts }] = await Promise.all([
    supabase.from("categories").select("id, name, slug, icon, is_active, sort_order, subcategories(id)").order("sort_order").order("name"),
    supabase.rpc("category_counts"),
  ]);
  const byCat = new Map(((counts as { category_id: string; subcategory_id: string | null; business_count: number }[]) ?? []).filter((c) => !c.subcategory_id).map((c) => [c.category_id, Number(c.business_count)]));
  const rows = (data as { id: string; name: string; slug: string; icon: string; is_active: boolean; subcategories: { id: string }[] }[]) ?? [];
  return (
    <div className="space-y-6">
      <PageHeader title="Categories" description="Changes apply immediately across search, navigation and registration — no code changes needed." />
      <Table head={["Order", "Category", "Slug", "Subcategories", "Approved listings", "Status"]}>
        {rows.map((c, i) => (
          <tr key={c.id} className="hover:bg-canvas/60">
            <td className="px-4 py-2">
              <div className="flex">
                <form action={moveCategoryAction.bind(null, c.id, "up")}><ConfirmButton variant="ghost" size="icon" disabled={i === 0} aria-label={`Move ${c.name} up`}><ArrowUp /></ConfirmButton></form>
                <form action={moveCategoryAction.bind(null, c.id, "down")}><ConfirmButton variant="ghost" size="icon" disabled={i === rows.length - 1} aria-label={`Move ${c.name} down`}><ArrowDown /></ConfirmButton></form>
              </div>
            </td>
            <td className="px-4 py-2"><Link href={`/admin/categories/${c.id}`} className="inline-flex items-center gap-2 font-medium text-navy-900 hover:underline"><CategoryIcon name={c.icon} className="size-4 text-emerald-600" /> {c.name}</Link></td>
            <td className="px-4 py-2 text-muted">{c.slug}</td>
            <td className="px-4 py-2 text-muted">{c.subcategories.length}</td>
            <td className="px-4 py-2 text-muted">{byCat.get(c.id) ?? 0}</td>
            <td className="px-4 py-2"><StatusBadge status={c.is_active ? "active" : "archived"} /></td>
          </tr>
        ))}
      </Table>
      <Card>
        <CardHeader title="Add a category" />
        <ActionForm action={saveCategoryAction.bind(null, null)} className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
          <TextField name="name" label="Name" required />
          <TextField name="slug" label="Slug" required placeholder="e.g. pet-services" />
          <TextField name="sort_order" label="Sort order" type="number" defaultValue={(rows.length + 1) * 10} />
          <input type="hidden" name="is_active" value="on" />
          <div className="sm:col-span-3"><SubmitButton>Create category</SubmitButton></div>
        </ActionForm>
      </Card>
    </div>
  );
}
