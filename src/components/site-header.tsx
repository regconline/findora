import Link from "next/link";
import Image from "next/image";
import { Container, LinkButton } from "@/components/ui";
import { SiteMenu, UserNav } from "@/components/site-header-client";
import { ThemeToggle } from "@/components/theme";
import { getCategories } from "@/lib/data";

export const NAV = [
  { href: "/", label: "Home" },
  { href: "/businesses", label: "Explore Businesses" },
  { href: "/categories", label: "Categories" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/blog", label: "Blog" },
];

/** Every public page, grouped — rendered in the menu panel. */
export const MENU_GROUPS = [
  {
    title: "Discover",
    links: [
      { href: "/", label: "Home" },
      { href: "/businesses", label: "Explore Businesses" },
      { href: "/categories", label: "Business Categories" },
      { href: "/services", label: "Services Directory" },
      { href: "/blog", label: "Blog & Guides" },
    ],
  },
  {
    title: "For businesses",
    links: [
      { href: "/list-your-business", label: "List Your Business" },
      { href: "/register/business", label: "Register a Business" },
      { href: "/how-it-works", label: "How Findora Works" },
      { href: "/listing-guidelines", label: "Listing Guidelines" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/help", label: "Help Centre" },
      { href: "/faq", label: "FAQs" },
      { href: "/contact", label: "Contact Us" },
      { href: "/report", label: "Report a Business" },
    ],
  },
  {
    title: "Company & legal",
    links: [
      { href: "/about", label: "About Findora" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms & Conditions" },
      { href: "/cookies", label: "Cookie Policy" },
      { href: "/advertising-policy", label: "Advertising Policy" },
      { href: "/site-map", label: "Sitemap" },
    ],
  },
];

export function Logo({ variant, className }: { variant?: "light" | "dark"; className?: string }) {
  const cls = className ?? "h-8 w-auto sm:h-9";
  if (variant) {
    return (
      <Image src={variant === "dark" ? "/brand/findora-logo-dark.png" : "/brand/findora-logo.png"} alt="Findora" width={960} height={287} className={cls} sizes="140px" />
    );
  }
  // Theme-aware: swaps to the dark-background logo in dark mode.
  return (
    <>
      <Image src="/brand/findora-logo.png" alt="Findora" width={960} height={287} priority className={`${cls} dark:hidden`} sizes="140px" />
      <Image src="/brand/findora-logo-dark.png" alt="Findora" width={960} height={287} className={`${cls} hidden dark:block`} sizes="140px" />
    </>
  );
}

export async function SiteHeader() {
  const categories = (await getCategories()).slice(0, 10).map((c) => ({ href: `/categories/${c.slug}`, label: c.name }));
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-md supports-[backdrop-filter]:bg-surface/80">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="Findora home" className="shrink-0 transition-opacity hover:opacity-85">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="relative rounded-lg px-3 py-2 text-sm font-medium text-ink/80 transition-colors after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-emerald-500 after:transition-transform after:duration-300 hover:text-heading hover:after:scale-x-100">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-1.5">
          <UserNav />
          <ThemeToggle />
          <LinkButton href="/list-your-business" size="sm" className="ml-1 hidden sm:inline-flex">
            List Your Business
          </LinkButton>
          <SiteMenu groups={MENU_GROUPS} categories={categories} />
        </div>
      </Container>
    </header>
  );
}
