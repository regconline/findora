import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/** GET search box + status pills used across admin list pages. */
export function AdminFilters({
  base, q, status, statuses, extra,
}: { base: string; q?: string; status?: string; statuses?: { value: string; label: string }[]; extra?: Record<string, string | undefined> }) {
  const href = (s?: string) => {
    const u = new URLSearchParams(Object.entries({ ...extra, q, status: s }).filter(([, v]) => v) as [string, string][]);
    return `${base}${u.size ? `?${u}` : ""}`;
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {statuses ? (
        <nav className="flex flex-wrap gap-1" aria-label="Filter by status">
          <Link href={href(undefined)} className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", !status ? "bg-navy-900 text-white" : "text-muted hover:bg-white")}>All</Link>
          {statuses.map((s) => (
            <Link key={s.value} href={href(s.value)} className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", status === s.value ? "bg-navy-900 text-white" : "text-muted hover:bg-white")}>{s.label}</Link>
          ))}
        </nav>
      ) : <span />}
      <form className="flex items-center gap-2" role="search">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        {Object.entries(extra ?? {}).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
        <label className="relative">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input name="q" defaultValue={q} placeholder="Search…" className="h-9 w-56 rounded-lg border border-line bg-white pl-9 pr-3 text-sm" />
        </label>
        <button className="h-9 rounded-lg border border-line bg-white px-3 text-sm font-medium">Search</button>
      </form>
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-line bg-canvas/60 text-xs uppercase tracking-wide text-muted">
          <tr>{head.map((h) => <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

/** Sanitised `ilike` pattern for PostgREST filters (strips wildcard and filter-syntax characters). */
export function ilike(q: string) {
  return `%${q.replace(/[%_,()"'\\*]/g, " ").trim().slice(0, 80)}%`;
}
