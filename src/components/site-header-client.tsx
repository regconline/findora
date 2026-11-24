"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LayoutDashboard } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import { cn } from "@/lib/utils";

function useSignedIn() {
  const [signedIn, setSignedIn] = useState<boolean | null>(isSupabaseConfigured ? null : false);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const sb = getBrowserClient();
    sb.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSignedIn(Boolean(s)));
    return () => sub.subscription.unsubscribe();
  }, []);
  return signedIn;
}

/** Auth-aware header link, resolved client-side so public pages stay cacheable. */
export function UserNav() {
  const signedIn = useSignedIn();
  if (signedIn) {
    return (
      <Link href="/dashboard" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-navy-900 hover:bg-navy-900/5">
        <LayoutDashboard className="size-4" aria-hidden /> <span className="hidden sm:inline">Dashboard</span>
      </Link>
    );
  }
  return (
    <Link href="/login" className={cn("inline-flex h-8 items-center rounded-lg px-3 text-[13px] font-semibold text-navy-900 hover:bg-navy-900/5", signedIn === null && "invisible")}>
      Log In
    </Link>
  );
}

export function MobileNav({ items }: { items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen((o) => !o)}
        className="grid size-10 place-items-center rounded-lg text-navy-900 hover:bg-navy-900/5"
      >
        {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
      </button>
      {open ? (
        <div id="mobile-nav" className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto border-t border-line bg-white px-4 pb-8 pt-4">
          <nav aria-label="Mobile">
            <ul className="space-y-1">
              {items.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="block rounded-lg px-3 py-3 text-base font-medium text-navy-900 hover:bg-canvas" aria-current={pathname === n.href ? "page" : undefined}>
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-6 grid gap-2 border-t border-line pt-6">
            <Link href="/list-your-business" className="flex h-12 items-center justify-center rounded-lg bg-emerald-500 font-semibold text-white">List Your Business</Link>
            <Link href="/login" className="flex h-12 items-center justify-center rounded-lg border border-line font-semibold text-navy-900">Log In</Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
