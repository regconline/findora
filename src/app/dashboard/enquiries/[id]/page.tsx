import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Mail, Phone, ArrowLeft, Archive, MailOpen, Inbox } from "lucide-react";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { ConfirmButton } from "@/components/form";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatPhone, telLink, whatsappLink } from "@/lib/utils";
import { setEnquiryStatusAction } from "../actions";

export const metadata: Metadata = { title: "Enquiry" };

export default async function EnquiryDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/dashboard/enquiries/${id}`);
  const supabase = await createClient();
  const { data: e } = await supabase
    .from("customer_enquiries")
    .select("*, business:businesses(id, name), service:services(name)")
    .eq("id", id)
    .maybeSingle();
  if (!e) notFound();
  const { data: canManage } = await supabase.rpc("can_manage_business", { p_business_id: e.business_id });
  if (!canManage) notFound(); // customers view their own enquiries under "My enquiries"

  if (e.status === "new") {
    await supabase.from("customer_enquiries").update({ status: "read" }).eq("id", id);
    e.status = "read";
  }
  const replySubject = encodeURIComponent(`Re: ${e.subject}`);
  const btn = "inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold";

  return (
    <div className="space-y-6">
      <Link href="/dashboard/enquiries" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-heading"><ArrowLeft className="size-4" aria-hidden /> All enquiries</Link>
      <PageHeader title={e.subject} description={<>To {e.business?.name} · {formatDateTime(e.created_at)} · <StatusBadge status={e.status} /></>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card className="p-5 sm:p-6">
          {e.service ? <p className="mb-3 text-sm text-muted">Regarding service: <strong className="text-heading">{e.service.name}</strong></p> : null}
          <p className="whitespace-pre-wrap leading-relaxed">{e.message}</p>
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-sm font-semibold">Customer</h2>
            <p className="mt-2 font-medium text-heading">{e.name}</p>
            <p className="text-sm break-all text-muted">{e.email}</p>
            {e.phone ? <p className="text-sm text-muted">{formatPhone(e.phone)}</p> : null}
            <div className="mt-4 grid gap-2">
              <a href={`mailto:${e.email}?subject=${replySubject}`} className={`${btn} justify-center bg-emerald-500 text-white hover:bg-emerald-600`}><Mail className="size-4" aria-hidden /> Reply by email</a>
              {e.phone ? <a href={telLink(e.phone)} className={`${btn} justify-center border border-line hover:bg-canvas`}><Phone className="size-4" aria-hidden /> Call</a> : null}
              {e.phone ? <a href={whatsappLink(e.phone, `Hi ${e.name}, thanks for your enquiry about “${e.subject}”.`)} target="_blank" rel="noopener" className={`${btn} justify-center border border-line hover:bg-canvas`}>WhatsApp</a> : null}
            </div>
          </Card>
          <Card className="flex flex-wrap gap-2 p-5">
            {e.status === "archived" ? (
              <form action={setEnquiryStatusAction.bind(null, id, "read")}><ConfirmButton><Inbox /> Move to inbox</ConfirmButton></form>
            ) : (
              <form action={setEnquiryStatusAction.bind(null, id, "archived")}><ConfirmButton><Archive /> Archive</ConfirmButton></form>
            )}
            <form action={setEnquiryStatusAction.bind(null, id, "new")}><ConfirmButton variant="ghost"><MailOpen /> Mark unread</ConfirmButton></form>
          </Card>
          <p className="px-1 text-xs text-muted">Use these contact details only to respond to this enquiry (POPIA purpose limitation).</p>
        </div>
      </div>
    </div>
  );
}
