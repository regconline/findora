import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { PostEditor } from "@/components/post-editor";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { saveBlogPostAction } from "../../actions";

export const metadata: Metadata = { title: "New article" };

export default async function NewPost() {
  await requireAdmin();
  const { data: cats } = await (await createClient()).from("blog_categories").select("id, name").order("sort_order");
  return (
    <div className="space-y-6">
      <Link href="/admin/blog" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-heading"><ArrowLeft className="size-4" aria-hidden /> Blog</Link>
      <PageHeader title="New article" />
      <PostEditor action={saveBlogPostAction.bind(null, null)} categories={cats ?? []} />
    </div>
  );
}
