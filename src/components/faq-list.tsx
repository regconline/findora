import { ChevronDown } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { Markdown } from "@/components/markdown";
import type { Faq } from "@/lib/types";

/** Accessible accordion using native <details>; no JavaScript required. */
export function FaqList({ faqs, structuredData = false }: { faqs: Faq[]; structuredData?: boolean }) {
  return (
    <div>
      <div className="divide-y divide-line rounded-card border border-line bg-white">
        {faqs.map((f) => (
          <details key={f.id} className="group px-5 py-1 sm:px-6">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left font-medium text-navy-900 [&::-webkit-details-marker]:hidden">
              {f.question}
              <ChevronDown className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <Markdown className="prose-findora pb-5 !text-[15px] !leading-7 text-ink/85">{f.answer}</Markdown>
          </details>
        ))}
      </div>
      {structuredData ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
          }}
        />
      ) : null}
    </div>
  );
}
