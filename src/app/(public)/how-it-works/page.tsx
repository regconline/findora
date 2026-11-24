import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Search, Eye, PhoneCall, UserPlus, ClipboardCheck, BarChart3 } from "lucide-react";
import { CmsPage } from "@/components/cms-page";
import { LinkButton } from "@/components/ui";
import { getSitePage } from "@/lib/data";

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const p = await getSitePage("how-it-works");
  return { title: p?.seo_title || "How Findora works", description: p?.seo_description || p?.summary || undefined, alternates: { canonical: "/how-it-works" } };
}

function Step({ icon: Icon, title, text }: { icon: typeof Search; title: string; text: string }) {
  return (
    <li className="flex gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><Icon className="size-4" aria-hidden /></span><span><span className="block text-sm font-semibold text-navy-900">{title}</span><span className="text-sm text-muted">{text}</span></span></li>
  );
}

export default async function HowItWorksPage() {
  const page = await getSitePage("how-it-works");
  if (!page) notFound();
  return (
    <CmsPage
      page={page}
      aside={
        <div className="space-y-6 lg:sticky lg:top-24">
          <div className="rounded-card border border-line bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">For customers</h2>
            <ul className="mt-4 space-y-4">
              <Step icon={Search} title="Search" text="By service, name or keyword, then filter by area." />
              <Step icon={Eye} title="Compare" text="Services, prices, hours and photos." />
              <Step icon={PhoneCall} title="Contact" text="Call, WhatsApp or send an enquiry." />
            </ul>
            <LinkButton href="/businesses" className="mt-5 w-full">Explore businesses</LinkButton>
          </div>
          <div className="rounded-card border border-line bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">For businesses</h2>
            <ul className="mt-4 space-y-4">
              <Step icon={UserPlus} title="Register" text="Free account, verified email." />
              <Step icon={ClipboardCheck} title="Get approved" text="We review every listing." />
              <Step icon={BarChart3} title="Grow" text="Track views, calls and enquiries." />
            </ul>
            <LinkButton href="/register/business" variant="navy" className="mt-5 w-full">List your business</LinkButton>
          </div>
        </div>
      }
    />
  );
}
