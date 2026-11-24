import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { LinkButton, PageHeader, StatusBadge } from "@/components/ui";
import { Table } from "@/components/admin-table";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Pages" };

export default async function AdminPages() {
  await requireAdmin();
  const { data } = await (await createClient()).from("site_pages").select("id, title, slug, is_published, updated_at").order("title");
  return (
    <div className="space-y-6">
      <PageHeader title="Website pages" description="About, How it works, legal pages and help content. Changes go live immediately.">
        <LinkButton href="/admin/pages/new"><Plus /> New page</LinkButton>
      </PageHeader>
      <Table head={["Title", "URL", "Status", "Updated"]}>
        {(data ?? []).map((p) => (
          <tr key={p.id} className="hover:bg-canvas/60">
            <td className="px-4 py-3"><Link href={`/admin/pages/${p.id}`} className="font-medium text-navy-900 hover:underline">{p.title}</Link></td>
            <td className="px-4 py-3 text-muted">/{p.slug}</td>
            <td className="px-4 py-3"><StatusBadge status={p.is_published ? "published" : "draft"} /></td>
            <td className="px-4 py-3 text-muted">{formatDateTime(p.updated_at)}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
