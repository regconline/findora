import Link from "next/link";
import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { Bell } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { ConfirmButton } from "@/components/form";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications" };

async function markAllRead() {
  "use server";
  const { user } = await requireUser("/dashboard/notifications");
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/dashboard", "layout");
}

export default async function NotificationsPage() {
  const { user } = await requireUser("/dashboard/notifications");
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
  const rows = (data as { id: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string }[]) ?? [];
  return (
    <div className="space-y-6">
      <PageHeader title="Notifications">
        {rows.some((r) => !r.read_at) ? <form action={markAllRead}><ConfirmButton size="md">Mark all as read</ConfirmButton></form> : null}
      </PageHeader>
      {rows.length ? (
        <Card>
          <ul className="divide-y divide-line">
            {rows.map((n) => (
              <li key={n.id} className={cn("px-5 py-4 sm:px-6", !n.read_at && "bg-emerald-50/40")}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={cn("text-heading", !n.read_at ? "font-semibold" : "font-medium")}>{n.link ? <Link href={n.link} className="hover:underline">{n.title}</Link> : n.title}</p>
                    {n.body ? <p className="text-sm text-muted">{n.body}</p> : null}
                  </div>
                  <span className="shrink-0 text-xs text-muted">{formatDateTime(n.created_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <EmptyState icon={Bell} title="No notifications" description="We'll let you know about enquiries and listing updates here." />
      )}
    </div>
  );
}
