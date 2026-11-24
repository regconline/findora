import Link from "next/link";
import type { Metadata } from "next";
import { Send } from "lucide-react";
import { Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { ConfirmButton } from "@/components/form";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn, formatDateTime } from "@/lib/utils";
import { setCustomerArchivedAction } from "../enquiries/actions";

export const metadata: Metadata = { title: "My enquiries" };

export default async function MyEnquiriesPage({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
  const { user } = await requireUser("/dashboard/my-enquiries");
  const archived = (await searchParams).archived === "1";
  const supabase = await createClient();
  const { data } = await supabase
    .from("customer_enquiries")
    .select("id, subject, message, status, created_at, customer_archived, business:businesses(name, slug)")
    .eq("customer_id", user.id)
    .eq("customer_archived", archived)
    .order("created_at", { ascending: false })
    .limit(100);
  type Row = { id: string; subject: string; message: string; status: string; created_at: string; business: { name: string; slug: string } | null };
  const rows = (data as unknown as Row[]) ?? [];
  const tab = (a: boolean) => cn("rounded-lg px-3 py-1.5 text-sm font-medium", a ? "bg-navy-900 text-white" : "text-muted hover:bg-surface");
  return (
    <div className="space-y-6">
      <PageHeader title="My enquiries" description="Enquiries you've sent to businesses. Businesses reply to you directly by email or phone." />
      <nav className="flex gap-1">
        <Link href="/dashboard/my-enquiries" className={tab(!archived)}>Active</Link>
        <Link href="/dashboard/my-enquiries?archived=1" className={tab(archived)}>Archived</Link>
      </nav>
      {rows.length ? (
        <Card>
          <ul className="divide-y divide-line">
            {rows.map((e) => (
              <li key={e.id} className="flex flex-wrap items-start gap-4 px-5 py-4 sm:px-6">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-heading">{e.subject}</p>
                  <p className="text-sm text-muted">
                    {e.business ? <Link href={`/businesses/${e.business.slug}`} className="hover:underline">{e.business.name}</Link> : "Business no longer listed"} · {formatDateTime(e.created_at)}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-ink/75">{e.message}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={e.status === "new" ? "info" : "success"}>{e.status === "new" ? "Delivered" : "Seen by business"}</Badge>
                  <form action={setCustomerArchivedAction.bind(null, e.id, !archived)}><ConfirmButton variant="ghost">{archived ? "Restore" : "Archive"}</ConfirmButton></form>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <EmptyState icon={Send} title={archived ? "No archived enquiries" : "No enquiries yet"} description="Find a business and use “Send enquiry” on their profile." action={<LinkButton href="/businesses" variant="outline">Explore businesses</LinkButton>} />
      )}
    </div>
  );
}
