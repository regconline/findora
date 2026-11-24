import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main" className="flex flex-1 items-center justify-center px-4 py-20 text-center">
        <div className="max-w-md">
          <p className="text-sm font-semibold text-emerald-700">404</p>
          <h1 className="mt-2 text-3xl font-bold">We couldn&apos;t find that page</h1>
          <p className="mt-3 text-muted">The page may have moved, or the business listing may no longer be available.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <LinkButton href="/businesses">Search businesses</LinkButton>
            <LinkButton href="/" variant="outline">Go home</LinkButton>
          </div>
          <p className="mt-6 text-sm text-muted">Need help? <Link href="/contact" className="text-emerald-700 underline">Contact us</Link></p>
        </div>
      </main>
    </div>
  );
}
