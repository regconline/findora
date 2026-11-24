import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Search, Store, ShieldCheck, Mail, Flag, FileText } from "lucide-react";
import { Container, Breadcrumbs } from "@/components/ui";
import { Markdown } from "@/components/markdown";
import { FaqList } from "@/components/faq-list";
import { getFaqs, getSitePage } from "@/lib/data";

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const p = await getSitePage("help");
  return { title: p?.seo_title || "Help Centre", description: p?.seo_description || p?.summary || undefined, alternates: { canonical: "/help" } };
}

export default async function HelpPage() {
  const [page, faqs] = await Promise.all([getSitePage("help"), getFaqs()]);
  if (!page) notFound();
  const topics = [
    { href: "/how-it-works", icon: Search, title: "Finding businesses", text: "Searching, filters and contacting businesses" },
    { href: "/list-your-business", icon: Store, title: "Listing a business", text: "Creating, editing and publishing your listing" },
    { href: "/listing-guidelines", icon: FileText, title: "Listing guidelines", text: "What we approve and what we don't" },
    { href: "/privacy", icon: ShieldCheck, title: "Privacy & your data", text: "POPIA rights, data export and deletion" },
    { href: "/report", icon: Flag, title: "Report a problem", text: "Suspicious listings, wrong information or photos" },
    { href: "/contact", icon: Mail, title: "Contact support", text: "Get in touch with the Findora team" },
  ];
  return (
    <Container className="py-10">
      <Breadcrumbs items={[{ label: "Help Centre" }]} />
      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{page.title}</h1>
      {page.summary ? <p className="mt-3 max-w-2xl text-lg text-muted">{page.summary}</p> : null}
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((t) => (
          <li key={t.href}>
            <Link href={t.href} className="flex h-full gap-4 rounded-card border border-line bg-white p-5 hover:border-emerald-500/60">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><t.icon className="size-5" aria-hidden /></span>
              <span><span className="block font-semibold text-navy-900">{t.title}</span><span className="text-sm text-muted">{t.text}</span></span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-14 grid gap-12 lg:grid-cols-[1.2fr_1fr]">
        <Markdown>{page.content}</Markdown>
        {faqs.length ? (
          <div>
            <h2 className="mb-4 text-xl font-semibold">Popular questions</h2>
            <FaqList faqs={faqs.slice(0, 8)} />
            <Link href="/faq" className="mt-4 inline-block text-sm font-semibold text-emerald-700 hover:underline">All FAQs →</Link>
          </div>
        ) : null}
      </div>
    </Container>
  );
}
