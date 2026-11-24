import type { Metadata } from "next";
import { Container, Breadcrumbs } from "@/components/ui";
import { FaqList } from "@/components/faq-list";
import { JsonLd } from "@/components/json-ld";
import { getFaqs } from "@/lib/data";

export const revalidate = 600;
export const metadata: Metadata = {
  title: "Frequently asked questions",
  description: "Answers to common questions about finding businesses, sending enquiries and listing your business on Findora.",
  alternates: { canonical: "/faq" },
};

const GROUPS = [
  { key: "general", title: "General" },
  { key: "customers", title: "For customers" },
  { key: "businesses", title: "For businesses" },
] as const;

export default async function FaqPage() {
  const faqs = await getFaqs();
  return (
    <Container className="py-10">
      <Breadcrumbs items={[{ label: "FAQs" }]} />
      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Frequently asked questions</h1>
      <div className="mt-10 max-w-3xl space-y-12">
        {GROUPS.map((g) => {
          const list = faqs.filter((f) => f.audience === g.key);
          return list.length ? (
            <section key={g.key} aria-labelledby={`faq-${g.key}`}>
              <h2 id={`faq-${g.key}`} className="mb-4 text-xl font-semibold">{g.title}</h2>
              <FaqList faqs={list} />
            </section>
          ) : null;
        })}
      </div>
      {faqs.length ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
          }}
        />
      ) : null}
    </Container>
  );
}
