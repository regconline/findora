"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, LayoutGrid, Building, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROVINCES } from "@/lib/constants";

type Suggestion = { label: string; kind: "business" | "subcategory" | "category" | "service"; slug: string | null; parent_slug: string | null };

export function SearchForm({
  categories, defaults = {}, variant = "hero",
}: {
  categories: { slug: string; name: string }[];
  defaults?: { q?: string; category?: string; province?: string };
  variant?: "hero" | "compact";
}) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState(defaults.q ?? "");
  const [fetched, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const ctrl = useRef<AbortController>(undefined);

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) return;
    timer.current = setTimeout(async () => {
      ctrl.current?.abort();
      ctrl.current = new AbortController();
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(q.trim())}`, { signal: ctrl.current.signal });
        const data = (await res.json()) as Suggestion[];
        setItems(data);
        setActive(-1);
      } catch {
        /* aborted */
      }
    }, 180);
    return () => clearTimeout(timer.current);
  }, [q]);

  const items = q.trim().length >= 2 ? fetched : [];

  const pick = (s: Suggestion) => {
    setOpen(false);
    if (s.kind === "business" && s.slug) router.push(`/businesses/${s.slug}`);
    else if (s.kind === "category" && s.slug) router.push(`/categories/${s.slug}`);
    else if (s.kind === "subcategory" && s.slug && s.parent_slug) router.push(`/categories/${s.parent_slug}/${s.slug}`);
    else {
      setQ(s.label);
      router.push(`/businesses?q=${encodeURIComponent(s.label)}`);
    }
  };

  const icon = { business: Building, category: LayoutGrid, subcategory: LayoutGrid, service: Tag };
  const hero = variant === "hero";
  const field = "h-12 w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-muted";

  return (
    <form
      action="/businesses"
      method="get"
      role="search"
      onSubmit={() => setOpen(false)}
      className={cn(
        "relative grid gap-2 rounded-2xl border border-line bg-white p-2 shadow-raised",
        hero ? "md:grid-cols-[1.6fr_1fr_1fr_auto]" : "md:grid-cols-[1.6fr_1fr_1fr_auto]",
      )}
    >
      <div className="relative flex items-center gap-2 rounded-xl px-3 md:border-r md:border-line md:rounded-none">
        <Search className="size-5 shrink-0 text-muted" aria-hidden />
        <label htmlFor={`${listId}-q`} className="sr-only">Search business or service</label>
        <input
          id={`${listId}-q`}
          name="q"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (!open || !items.length) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(items.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(-1, a - 1));
            } else if (e.key === "Enter" && active >= 0) {
              e.preventDefault();
              pick(items[active]!);
            } else if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Search business or service"
          autoComplete="off"
          role="combobox"
          aria-expanded={open && items.length > 0}
          aria-controls={`${listId}-list`}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
          maxLength={100}
          className={field}
        />
        {open && items.length > 0 ? (
          <ul id={`${listId}-list`} role="listbox" className="absolute left-0 right-0 top-full z-30 mt-3 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-raised">
            {items.map((s, i) => {
              const Icon = icon[s.kind];
              return (
                <li
                  key={`${s.kind}-${s.label}-${i}`}
                  id={`${listId}-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(s);
                  }}
                  className={cn("flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm", i === active ? "bg-canvas" : "hover:bg-canvas")}
                >
                  <Icon className="size-4 text-muted" aria-hidden />
                  <span className="flex-1 truncate text-ink">{s.label}</span>
                  <span className="text-xs capitalize text-muted">{s.kind === "subcategory" ? "category" : s.kind}</span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
      <div className="flex items-center gap-2 rounded-xl px-3 md:border-r md:border-line md:rounded-none">
        <LayoutGrid className="size-5 shrink-0 text-muted" aria-hidden />
        <label htmlFor={`${listId}-c`} className="sr-only">Category</label>
        <select id={`${listId}-c`} name="category" defaultValue={defaults.category ?? ""} className={cn(field, "cursor-pointer")}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2 rounded-xl px-3">
        <MapPin className="size-5 shrink-0 text-muted" aria-hidden />
        <label htmlFor={`${listId}-p`} className="sr-only">Province</label>
        <select id={`${listId}-p`} name="province" defaultValue={defaults.province ?? ""} className={cn(field, "cursor-pointer")}>
          <option value="">All of South Africa</option>
          {PROVINCES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <button type="submit" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 font-semibold text-white transition-colors hover:bg-emerald-600">
        <Search className="size-4" aria-hidden /> Search
      </button>
    </form>
  );
}
