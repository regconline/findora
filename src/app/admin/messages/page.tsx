import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { ConfirmButton } from "@/components/form";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";
import { markMessageHandledAction } from "../actions";

export const metadata: Metadata = { title: "Contact messages" };

export default async function AdminMessages() {
  await requireAdmin();
  const { data } = await (await createClient()).from("contact_messages").select("*").order("status").order("created_at", { ascending: false }).limit(100);
  const rows = (data as { id: string; name: string; email: string; topic: string; message: string; status: string; created_at: string }[]) ?? [];
  return (
    <div className="space-y-6">
      <PageHeader title="Contact messages" description="Messages from the Contact Us form. Reply by email." />
      {rows.length ? (
        <ul className="space-y-4">
          {rows.map((m) => (
            <li key={m.id}>
              <Card className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-navy-900">{m.name} <span className="font-normal text-muted">· {m.email} · {m.topic}</span></p>
                  <span className="flex items-center gap-2 text-xs text-muted">{formatDateTime(m.created_at)} <StatusBadge status={m.status === "new" ? "new" : "resolved"} /></span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm">{m.message}</p>
                <div className="mt-4 flex gap-2">
                  <a href={`mailto:${m.email}?subject=${encodeURIComponent("Re: your message to Findora")}`} className="inline-flex h-8 items-center rounded-lg bg-emerald-500 px-3 text-[13px] font-semibold text-white">Reply</a>
                  {m.status === "new" ? <form action={markMessageHandledAction.bind(null, m.id)}><ConfirmButton>Mark handled</ConfirmButton></form> : null}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : <EmptyState icon={Mail} title="No messages yet" />}
    </div>
  );
}
