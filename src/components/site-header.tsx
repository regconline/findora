import Link from "next/link";
import Image from "next/image";
import { Container, LinkButton } from "@/components/ui";
import { MobileNav, UserNav } from "@/components/site-header-client";

export const NAV = [
  { href: "/", label: "Home" },
  { href: "/businesses", label: "Explore Businesses" },
  { href: "/categories", label: "Categories" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/blog", label: "Blog" },
];

export function Logo({ variant = "light", className }: { variant?: "light" | "dark"; className?: string }) {
  return (
    <Image
      src={variant === "dark" ? "/brand/findora-logo-dark.png" : "/brand/findora-logo.png"}
      alt="Findora"
      width={960}
      height={287}
      priority
      className={className ?? "h-8 w-auto sm:h-9"}
      sizes="140px"
    />
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="Findora home" className="shrink-0">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="rounded-lg px-3 py-2 text-sm font-medium text-ink/80 transition-colors hover:bg-navy-900/5 hover:text-navy-900">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <UserNav />
          <LinkButton href="/list-your-business" size="sm" className="hidden sm:inline-flex">
            List Your Business
          </LinkButton>
          <MobileNav items={NAV} />
        </div>
      </Container>
    </header>
  );
}
