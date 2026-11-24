import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Alert, PageHeader, StatusBadge } from "@/components/ui";
import { ConfirmButton } from "@/components/form";
import { PostEditor } from "@/components/post-editor";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteBlogPostAction, saveBlogPostAction } from "../../actions";
import type { BlogPost } from "@/lib/types";

export const metadata: Metadata = { title: "Edit article" };

export default async function EditPost({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: post }, { data: cats }] = await Promise.all([
    supabase.from("blog_posts").select("*").eq("id", id).maybeSingle(),
    supabase.from("blog_categories").select("id, name").order("sort_order"),
  ]);
  if (!post) notFound();
  const p = post as BlogPost;
  const live = (p.status === "published" || p.status === "scheduled") && p.published_at && new Date(p.published_at) <= new Date();
  return (
    <div className="space-y-6">
      <Link href="/admin/blog" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-navy-900"><ArrowLeft className="size-4" aria-hidden /> Blog</Link>
      <PageHeader title={p.title} description={<StatusBadge status={p.status} />}>
        {live ? <Link href={`/blog/${p.slug}`} target="_blank" className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold"><ExternalLink className="size-4" aria-hidden /> View</Link> : null}
        <form action={deleteBlogPostAction.bind(null, id)}><ConfirmButton variant="danger-outline" size="md" confirm="Delete this article permanently?">Delete</ConfirmButton></form>
      </PageHeader>
      {sp.saved ? <Alert tone="success">Article created.</Alert> : null}
      <PostEditor action={saveBlogPostAction.bind(null, id)} post={p} categories={cats ?? []} />
    </div>
  );
}
