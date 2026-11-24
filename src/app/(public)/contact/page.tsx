import type { Metadata } from "next";
import { Mail, ShieldCheck, Clock } from "lucide-react";
import { Container, Breadcrumbs, Card } from "@/components/ui";
import { ActionForm, Honeypot, SelectField, SubmitButton, TextField, TextareaField } from "@/components/form";
import { Markdown } from "@/components/markdown";
import { Turnstile } from "@/components/turnstile";
import { getSettings, getSitePage } from "@/lib/data";
import { contactAction } from "../actions";

export const revalidate = 600;
export const metadata: Metadata = { title: "Contact us", description: "Get in touch with the Findora team for support, business listings, privacy requests or advertising.", alternates: { canonical: "/contact" } };

export default async function ContactPage() {
  const [page, settings] = await Promise.all([getSitePage("contact"), getSettings()]);
  return (
    <Container className="py-10">
      <Breadcrumbs items={[{ label: "Contact" }]} />
      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">{page?.title ?? "Contact us"}</h1>
          {page?.summary ? <p className="mt-3 text-lg text-muted">{page.summary}</p> : null}
          {page ? <div className="mt-6"><Markdown>{page.content}</Markdown></div> : null}
          <ul className="mt-8 space-y-4 text-sm">
            <li className="flex gap-3"><Mail className="size-5 text-emerald-600" aria-hidden /><span><strong className="block text-heading">General enquiries</strong><a href={`mailto:${settings.contact_email}`} className="text-emerald-700 underline">{settings.contact_email}</a></span></li>
            <li className="flex gap-3"><ShieldCheck className="size-5 text-emerald-600" aria-hidden /><span><strong className="block text-heading">Privacy and information requests</strong><a href={`mailto:${settings.privacy_email}`} className="text-emerald-700 underline">{settings.privacy_email}</a></span></li>
            <li className="flex gap-3"><Clock className="size-5 text-emerald-600" aria-hidden /><span><strong className="block text-heading">Response time</strong>Usually within two working days</span></li>
          </ul>
        </div>
        <Card className="p-6 sm:p-8">
          <h2 className="text-lg font-semibold">Send us a message</h2>
          <ActionForm action={contactAction} resetOnSuccess className="relative mt-5 space-y-4">
            <Honeypot />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="name" label="Your name" autoComplete="name" required />
              <TextField name="email" label="Email" type="email" autoComplete="email" required />
            </div>
            <SelectField name="topic" label="Topic" defaultValue="general" options={[
              { value: "general", label: "General question" },
              { value: "business", label: "My business listing" },
              { value: "privacy", label: "Privacy / POPIA request" },
              { value: "advertising", label: "Advertising" },
              { value: "report", label: "Report a problem" },
            ]} />
            <TextareaField name="message" label="Message" rows={6} required maxLength={4000} />
            <Turnstile />
            <SubmitButton size="lg" pendingText="Sending…">Send message</SubmitButton>
            <p className="text-xs text-muted">We use your details only to respond to your message.</p>
          </ActionForm>
        </Card>
      </div>
    </Container>
  );
}
