"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ArrowRight } from "lucide-react";
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
      <Link href="/dashboard" className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-heading transition-colors hover:bg-heading/5">
        <LayoutDashboard className="size-4" aria-hidden /> <span className="hidden sm:inline">Dashboard</span>
      </Link>
    );
  }
  return (
    <Link href="/login" className={cn("inline-flex h-9 items-center rounded-lg px-3 text-[13px] font-semibold text-heading transition-colors hover:bg-heading/5", signedIn === null && "invisible")}>
      Log In
    </Link>
  );
}

type Group = { title: string; links: { href: string; label: string }[] };

/**
 * Two-stroke menu button (animates into an ×) that opens a panel listing every page.
 * Works on all screen sizes; closes on navigation, Escape or backdrop click.
 */
export function SiteMenu({ groups, categories }: { groups: Group[]; categories: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  const signedIn = useSignedIn();
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"));

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="site-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((o) => !o)}
        className="group relative grid size-10 place-items-center rounded-lg text-heading transition-colors hover:bg-heading/5"
      >
        <span aria-hidden className="relative block h-3 w-[22px]">
          <span className={cn("absolute left-0 h-[2px] w-full rounded-full bg-current transition-all duration-300 ease-out", open ? "top-[5px] rotate-45" : "top-0 group-hover:w-[16px]")} />
          <span className={cn("absolute left-0 h-[2px] w-full rounded-full bg-current transition-all duration-300 ease-out", open ? "top-[5px] -rotate-45" : "top-[10px]")} />
        </span>
      </button>

      <div
        aria-hidden={!open}
        onClick={() => setOpen(false)}
        className={cn("fixed inset-0 top-16 z-40 bg-navy-950/40 backdrop-blur-[2px] transition-opacity duration-300", open ? "opacity-100" : "pointer-events-none opacity-0")}
      />
      <div
        id="site-menu"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        inert={!open}
        className={cn(
          "fixed inset-x-0 top-16 z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-line bg-surface shadow-raised transition-[opacity,transform] duration-300 ease-out",
          open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-3 opacity-0",
        )}
      >
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 md:grid-cols-2 lg:grid-cols-5 lg:px-8">
          {groups.map((g, gi) => (
            <nav key={g.title} aria-label={g.title} className={cn(open && "animate-fade-up")} style={{ animationDelay: `${gi * 50}ms` }}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{g.title}</p>
              <ul className="mt-3 space-y-1">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      aria-current={isActive(l.href) ? "page" : undefined}
                      className={cn(
                        "group/link flex items-center justify-between rounded-lg px-2 py-2 text-[15px] font-medium transition-colors",
                        isActive(l.href) ? "bg-emerald-50 text-emerald-700" : "text-heading hover:bg-heading/5",
                      )}
                    >
                      {l.label}
                      <ArrowRight className="size-4 -translate-x-1 opacity-0 transition-all duration-200 group-hover/link:translate-x-0 group-hover/link:opacity-100" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <nav aria-label="Popular categories" className={cn(open && "animate-fade-up")} style={{ animationDelay: "200ms" }}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Popular categories</p>
            <ul className="mt-3 space-y-1">
              {categories.map((c) => (
                <li key={c.href}>
                  <Link href={c.href} className="block rounded-lg px-2 py-1.5 text-sm text-ink/85 transition-colors hover:bg-heading/5 hover:text-heading">{c.label}</Link>
                </li>
              ))}
              <li><Link href="/categories" className="block px-2 py-1.5 text-sm font-semibold text-emerald-700 hover:underline">All categories →</Link></li>
            </ul>
          </nav>
        </div>
        <div className="border-t border-line bg-canvas/60">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
            {signedIn ? (
              <Link href="/dashboard" className="inline-flex h-10 items-center gap-2 rounded-lg bg-navy-900 px-4 text-sm font-semibold text-white">Go to dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="inline-flex h-10 items-center rounded-lg border border-line bg-surface px-4 text-sm font-semibold text-heading hover:bg-canvas">Log In</Link>
                <Link href="/register" className="inline-flex h-10 items-center rounded-lg border border-line bg-surface px-4 text-sm font-semibold text-heading hover:bg-canvas">Create account</Link>
              </>
            )}
            <Link href="/list-your-business" className="inline-flex h-10 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-600">List Your Business — free</Link>
          </div>
        </div>
      </div>
    </>
  );
}
