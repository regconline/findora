import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/site-header";

// Authentication pages are never indexed and never show advertising.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Findora home"><Logo /></Link>
          <Link href="/businesses" className="text-sm font-medium text-muted hover:text-navy-900">Explore businesses</Link>
        </div>
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 py-10 sm:py-16">{children}</main>
      <footer className="py-6 text-center text-xs text-muted">
        <Link href="/privacy" className="hover:underline">Privacy</Link> · <Link href="/terms" className="hover:underline">Terms</Link> · <Link href="/help" className="hover:underline">Help</Link>
      </footer>
    </div>
  );
}
