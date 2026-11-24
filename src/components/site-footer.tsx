import Link from "next/link";
import { Mail } from "lucide-react";
import { FacebookIcon as Facebook, InstagramIcon as Instagram, LinkedinIcon as Linkedin } from "@/components/brand-icons";
import { Container } from "@/components/ui";
import { Logo } from "@/components/site-header";
import { CookieSettingsButton } from "@/components/consent";
import { getSettings, getCategories, getBlogCategories } from "@/lib/data";
import { SITE } from "@/lib/constants";

export async function SiteFooter() {
  const [settings, categories, blogCats] = await Promise.all([getSettings(), getCategories(), getBlogCategories()]);
  const year = new Date().getFullYear();
  const social = settings.social ?? {};
  const cols = [
    {
      title: "Findora",
      links: [
        { href: "/about", label: "About" },
        { href: "/how-it-works", label: "How It Works" },
        { href: "/blog", label: "Blog" },
        { href: "/services", label: "Services directory" },
        { href: "/contact", label: "Contact" },
        { href: "/site-map", label: "Sitemap" },
      ],
    },
    {
      title: "For businesses",
      links: [
        { href: "/list-your-business", label: "List your business" },
        { href: "/register/business", label: "Business registration" },
        { href: "/listing-guidelines", label: "Listing guidelines" },
        { href: "/login", label: "Business log in" },
      ],
    },
    {
      title: "Support",
      links: [
        { href: "/help", label: "Help Centre" },
        { href: "/faq", label: "FAQs" },
        { href: "/report", label: "Report a business" },
        { href: "/contact", label: "Customer support" },
      ],
    },
    {
      title: "Legal",
      links: [
        { href: "/privacy", label: "Privacy policy" },
        { href: "/terms", label: "Terms and conditions" },
        { href: "/cookies", label: "Cookie policy" },
        { href: "/advertising-policy", label: "Advertising policy" },
      ],
    },
  ];
  return (
    <footer className="mt-auto bg-navy-900 text-white/80">
      <Container className="py-14">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_3fr]">
          <div>
            <Logo variant="dark" className="h-9 w-auto" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">{SITE.tagline} Free business listings and direct contact with service providers across South Africa.</p>
            <div className="mt-5 flex items-center gap-2">
              {social.facebook ? <a href={social.facebook} aria-label="Findora on Facebook" rel="noopener" className="grid size-9 place-items-center rounded-lg bg-white/10 hover:bg-white/20"><Facebook className="size-4" /></a> : null}
              {social.instagram ? <a href={social.instagram} aria-label="Findora on Instagram" rel="noopener" className="grid size-9 place-items-center rounded-lg bg-white/10 hover:bg-white/20"><Instagram className="size-4" /></a> : null}
              {social.linkedin ? <a href={social.linkedin} aria-label="Findora on LinkedIn" rel="noopener" className="grid size-9 place-items-center rounded-lg bg-white/10 hover:bg-white/20"><Linkedin className="size-4" /></a> : null}
              <a href={`mailto:${settings.contact_email}`} aria-label="Email Findora" className="grid size-9 place-items-center rounded-lg bg-white/10 hover:bg-white/20"><Mail className="size-4" /></a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {cols.map((c) => (
              <div key={c.title}>
                <h2 className="text-sm font-semibold text-white">{c.title}</h2>
                <ul className="mt-3 space-y-2.5 text-sm">
                  {c.links.map((l) => (
                    <li key={l.href + l.label}><Link href={l.href} className="transition-colors hover:text-white">{l.label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        {categories.length ? (
          <div className="mt-12 border-t border-white/10 pt-8">
            <h2 className="text-sm font-semibold text-white">Popular categories</h2>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {categories.slice(0, 12).map((c) => (
                <li key={c.id}><Link href={`/categories/${c.slug}`} className="hover:text-white">{c.name}</Link></li>
              ))}
            </ul>
          </div>
        ) : null}
        {blogCats.length ? (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-white">Guides</h2>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {blogCats.map((c) => (
                <li key={c.id}><Link href={`/blog/category/${c.slug}`} className="hover:text-white">{c.name}</Link></li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Findora. All rights reserved. Findora is a directory — businesses are responsible for the accuracy of their listings.</p>
          <CookieSettingsButton className="text-left hover:text-white" />
        </div>
      </Container>
    </footer>
  );
}
