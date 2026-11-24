import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { Card, CardHeader, LinkButton, PageHeader, StatusBadge } from "@/components/ui";
import { ActionForm, SubmitButton, TextField } from "@/components/form";
import { Table } from "@/components/admin-table";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";
import { saveBlogCategoryAction } from "../actions";

export const metadata: Metadata = { title: "Blog" };

export default async function AdminBlog() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: posts }, { data: cats }] = await Promise.all([
    supabase.from("blog_posts").select("id, title, slug, status, published_at, updated_at, blog_categories(name)").order("updated_at", { ascending: false }),
    supabase.from("blog_categories").select("id, name, slug").order("sort_order"),
  ]);
  type P = { id: string; title: string; slug: string; status: string; published_at: string | null; updated_at: string; blog_categories: { name: string } | null };
  // eslint-disable-next-line react-hooks/purity -- server component, request-time date
  const now = Date.now();
  return (
    <div className="space-y-6">
      <PageHeader title="Blog articles" description="Original editorial content. Scheduled articles go live automatically at their publication time.">
        <LinkButton href="/admin/blog/new"><Plus /> New article</LinkButton>
      </PageHeader>
      <Table head={["Title", "Category", "Status", "Publication", "Updated"]}>
        {((posts as unknown as P[]) ?? []).map((p) => (
          <tr key={p.id} className="hover:bg-canvas/60">
            <td className="px-4 py-3"><Link href={`/admin/blog/${p.id}`} className="font-medium text-heading hover:underline">{p.title}</Link></td>
            <td className="px-4 py-3 text-muted">{p.blog_categories?.name ?? "—"}</td>
            <td className="px-4 py-3"><StatusBadge status={p.status === "scheduled" && p.published_at && new Date(p.published_at).getTime() <= now ? "published" : p.status} /></td>
            <td className="px-4 py-3 text-muted">{p.published_at ? formatDateTime(p.published_at) : "—"}</td>
            <td className="px-4 py-3 text-muted">{formatDateTime(p.updated_at)}</td>
          </tr>
        ))}
      </Table>
      <Card>
        <CardHeader title="Blog categories" description={(cats ?? []).map((c) => c.name).join(" · ") || "None yet"} />
        <ActionForm action={saveBlogCategoryAction} resetOnSuccess className="grid gap-4 p-5 sm:grid-cols-4 sm:p-6">
          <TextField name="name" label="Name" required />
          <TextField name="slug" label="Slug" required />
          <TextField name="description" label="Description" optional />
          <div className="flex items-end"><SubmitButton variant="outline">Add category</SubmitButton></div>
        </ActionForm>
      </Card>
    </div>
  );
}
