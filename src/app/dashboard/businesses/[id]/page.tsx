import Link from "next/link";
import type { Metadata } from "next";
import { ExternalLink, FileText, MapPin, Phone, Images, Tags, Eye, Send, BarChart3 } from "lucide-react";
import { Alert, Card, CardHeader, LinkButton, PageHeader, StatusBadge } from "@/components/ui";
import { ConfirmButton } from "@/components/form";
import { requireManagedBusiness } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { deleteBusinessAction, getCompleteness, unpublishAction } from "../actions";

export const metadata: Metadata = { title: "Manage listing" };

export default async function ManageBusinessPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ submitted?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { business: b } = await requireManagedBusiness(id);
  const completeness = await getCompleteness(id);
  const done = completeness.filter((c) => c.done).length;
  const s = (k: string) => `/dashboard/businesses/${id}/setup/${k}`;
  const sections = [
    { href: s("business"), icon: FileText, title: "Business information", text: "Name, description, category, registration details" },
    { href: s("location"), icon: MapPin, title: "Location", text: "Address, province, service areas, map coordinates" },
    { href: s("contact"), icon: Phone, title: "Contact & hours", text: "Phone, WhatsApp, email, social links, operating hours" },
    { href: s("branding"), icon: Images, title: "Photographs", text: "Logo, cover photo and gallery" },
    { href: s("services"), icon: Tags, title: "Services", text: "Services, descriptions and prices" },
    { href: s("review"), icon: Eye, title: "Preview", text: "See your profile as customers will" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={b.name} description={<span className="inline-flex items-center gap-2"><StatusBadge status={b.status} />{b.approved_at ? <span className="text-sm">Published {formatDate(b.approved_at)}</span> : null}</span>}>
        {b.status === "approved" ? <LinkButton href={`/businesses/${b.slug}`} variant="outline" target="_blank"><ExternalLink /> View public profile</LinkButton> : null}
        <LinkButton href={`/dashboard/analytics?business=${id}`} variant="outline"><BarChart3 /> Analytics</LinkButton>
      </PageHeader>

      {sp.submitted ? <Alert tone="success" title="Listing submitted">Thank you! Our team will review your listing, usually within two working days. We&apos;ll email you the outcome.</Alert> : null}
      {b.status === "draft" ? (
        <Alert tone="info" title="Not yet published">
          Complete your listing and submit it for review. <Link href={s(done === completeness.length ? "submit" : completeness.find((c) => c.required && !c.done)?.key === "services" ? "services" : "review")} className="font-semibold underline">Continue setup</Link>
        </Alert>
      ) : null}
      {b.status === "pending" ? <Alert tone="warning" title="Awaiting review">Submitted {formatDate(b.submitted_at)}. You can keep editing while you wait.</Alert> : null}
      {b.status === "rejected" ? (
        <Alert tone="danger" title="Changes needed">
          {b.rejection_reason ?? "Please review your listing."} <Link href={s("submit")} className="font-semibold underline">Update and resubmit</Link>
        </Alert>
      ) : null}
      {b.status === "suspended" ? <Alert tone="danger" title="Suspended">{b.suspended_reason ?? "This listing is hidden from the public."} <Link href="/contact" className="font-semibold underline">Contact support</Link></Alert> : null}

      <Card className="p-5 sm:p-6">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">Profile completeness</span>
          <span className="text-muted">{done} of {completeness.length}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-canvas"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${(done / completeness.length) * 100}%` }} /></div>
        {done < completeness.length ? (
          <p className="mt-3 text-sm text-muted">Next: <Link href={completeness.find((c) => !c.done)!.href} className="font-medium text-emerald-700 underline">{completeness.find((c) => !c.done)!.label}</Link></p>
        ) : null}
      </Card>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((x) => (
          <li key={x.href}>
            <Link href={x.href} className="flex h-full gap-4 rounded-card border border-line bg-white p-5 hover:border-emerald-500/60">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><x.icon className="size-5" aria-hidden /></span>
              <span>
                <span className="block font-semibold text-navy-900">{x.title}</span>
                <span className="text-sm text-muted">{x.text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <Card>
        <CardHeader title="Publication" />
        <div className="flex flex-wrap items-center gap-3 p-5 sm:p-6">
          {["draft", "rejected"].includes(b.status) ? <LinkButton href={s("submit")}><Send /> Submit for review</LinkButton> : null}
          {b.status === "approved" || b.status === "pending" ? (
            <form action={unpublishAction.bind(null, id)}><ConfirmButton size="md" confirm="Unpublish this listing? It will be hidden until you resubmit it for review.">Unpublish listing</ConfirmButton></form>
          ) : null}
          <form action={deleteBusinessAction.bind(null, id)} className="ml-auto">
            <ConfirmButton size="md" variant="danger-outline" confirm="Delete this listing permanently? Enquiries and statistics will no longer be available.">Delete listing</ConfirmButton>
          </form>
        </div>
      </Card>
    </div>
  );
}
