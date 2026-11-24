import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Container, Breadcrumbs, LinkButton } from "@/components/ui";
import { Markdown } from "@/components/markdown";
import { FaqList } from "@/components/faq-list";
import { getFaqs, getSitePage } from "@/lib/data";

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const p = await getSitePage("list-your-business");
  return { title: p?.seo_title || "List your business for free", description: p?.seo_description || p?.summary || undefined, alternates: { canonical: "/list-your-business" } };
}

export default async function ListYourBusinessPage() {
  const [page, faqs] = await Promise.all([getSitePage("list-your-business"), getFaqs("businesses")]);
  if (!page) notFound();
  return (
    <>
      <section className="bg-navy-900 text-white">
        <Container className="py-14 sm:py-20">
          <Breadcrumbs items={[{ label: page.title }]} className="[&_a]:text-white/70 [&_span]:text-white" />
          <div className="mt-6 grid items-center gap-10 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <h1 className="text-4xl font-bold text-white sm:text-5xl">{page.title}</h1>
              {page.summary ? <p className="mt-4 max-w-xl text-lg text-white/75">{page.summary}</p> : null}
              <div className="mt-8 flex flex-wrap gap-3">
                <LinkButton href="/register/business" size="lg">Create your free listing</LinkButton>
                <LinkButton href="/login?next=/dashboard/businesses/new" size="lg" variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10">I already have an account</LinkButton>
              </div>
            </div>
            <ul className="space-y-3 rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
              {["Free listing — no fees, no commission", "Services, prices, hours and photos", "Call, WhatsApp and enquiry buttons", "Your own search-friendly profile page", "Real analytics: views, clicks and enquiries", "Edit or remove your listing at any time"].map((t) => (
                <li key={t} className="flex items-start gap-3 text-white/90"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" aria-hidden /> {t}</li>
              ))}
            </ul>
          </div>
        </Container>
      </section>
      <Container className="grid gap-12 py-14 lg:grid-cols-[1.3fr_1fr]">
        <Markdown>{page.content}</Markdown>
        {faqs.length ? (
          <div>
            <h2 className="mb-4 text-xl font-semibold">Questions from business owners</h2>
            <FaqList faqs={faqs.slice(0, 8)} />
          </div>
        ) : null}
      </Container>
    </>
  );
}
