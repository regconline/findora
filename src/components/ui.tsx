import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronLeft, ChevronRight, ChevronRight as Sep, type LucideIcon } from "lucide-react";
import { cn, pageRange } from "@/lib/utils";
import { env } from "@/lib/env";
import { JsonLd } from "@/components/json-ld";

// ---------------------------------------------------------------------------
// Button (shadcn/ui-style API)
// ---------------------------------------------------------------------------
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-60 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700",
        navy: "bg-navy-900 text-white hover:bg-navy-800",
        outline: "border border-line bg-white text-navy-900 hover:border-navy-900/30 hover:bg-canvas",
        ghost: "text-navy-900 hover:bg-navy-900/5",
        danger: "bg-danger text-white hover:bg-danger/90",
        "danger-outline": "border border-danger/30 bg-white text-danger hover:bg-danger-50",
        link: "px-0 text-emerald-700 underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-10 px-4",
        lg: "h-12 px-5 text-[15px]",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);
export type ButtonVariants = VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & ButtonVariants) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export function LinkButton({
  className, variant, size, href, ...props
}: React.ComponentProps<typeof Link> & ButtonVariants) {
  return <Link href={href} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

// ---------------------------------------------------------------------------
// Layout primitives
// ---------------------------------------------------------------------------
export function Container({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)} {...props} />;
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-card border border-line bg-white shadow-card", className)} {...props} />;
}

export function CardHeader({ title, description, action, className }: { title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6", className)}>
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, description, action, className }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-8 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="max-w-2xl">
        {eyebrow ? <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">{eyebrow}</p> : null}
        <h2 className="text-2xl font-semibold sm:text-3xl">{title}</h2>
        {description ? <p className="mt-2 text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, children, className }: { title: string; description?: React.ReactNode; children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold sm:text-[1.75rem]">{title}</h1>
        {description ? <p className="mt-1 text-muted">{description}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------
const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium [&_svg]:size-3.5", {
  variants: {
    tone: {
      neutral: "bg-navy-900/5 text-navy-800",
      success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20",
      warning: "bg-amber-100 text-[#8a5a10]",
      danger: "bg-danger-50 text-danger",
      info: "bg-[#e8f1f7] text-navy-800",
      sponsored: "bg-amber-100 text-[#8a5a10] ring-1 ring-amber-500/30",
    },
  },
  defaultVariants: { tone: "neutral" },
});
export function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: VariantProps<typeof badgeVariants>["tone"]; label: string }> = {
    draft: { tone: "neutral", label: "Draft" },
    pending: { tone: "warning", label: "Pending review" },
    approved: { tone: "success", label: "Published" },
    rejected: { tone: "danger", label: "Changes needed" },
    suspended: { tone: "danger", label: "Suspended" },
    new: { tone: "info", label: "New" },
    read: { tone: "neutral", label: "Read" },
    archived: { tone: "neutral", label: "Archived" },
    open: { tone: "warning", label: "Open" },
    reviewing: { tone: "info", label: "Reviewing" },
    resolved: { tone: "success", label: "Resolved" },
    dismissed: { tone: "neutral", label: "Dismissed" },
    published: { tone: "success", label: "Published" },
    scheduled: { tone: "info", label: "Scheduled" },
    active: { tone: "success", label: "Active" },
    deleted: { tone: "neutral", label: "Deleted" },
  };
  const m = map[status] ?? { tone: "neutral" as const, label: status };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function Alert({ tone = "info", title, children, className }: { tone?: "info" | "success" | "warning" | "danger"; title?: string; children?: React.ReactNode; className?: string }) {
  const tones = {
    info: "border-navy-900/10 bg-[#eef4f7] text-navy-900",
    success: "border-emerald-500/25 bg-emerald-50 text-emerald-700",
    warning: "border-amber-500/30 bg-amber-100/60 text-[#734a0c]",
    danger: "border-danger/25 bg-danger-50 text-danger",
  };
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("rounded-xl border px-4 py-3 text-sm", tones[tone], className)}>
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={cn(title && "mt-1")}>{children}</div> : null}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }: { icon?: LucideIcon; title: string; description?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center rounded-card border border-dashed border-line bg-white px-6 py-12 text-center", className)}>
      {Icon ? (
        <div className="mb-4 grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-700">
          <Icon className="size-6" aria-hidden />
        </div>
      ) : null}
      <h3 className="text-base font-semibold">{title}</h3>
      {description ? <p className="mt-1 max-w-md text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, hint }: { label: string; value: number | string; icon?: LucideIcon; hint?: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{label}</p>
        {Icon ? <Icon className="size-4 text-emerald-600" aria-hidden /> : null}
      </div>
      <p className="mt-2 text-2xl font-semibold text-navy-900 tabular-nums">{typeof value === "number" ? value.toLocaleString("en-ZA") : value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Navigation helpers
// ---------------------------------------------------------------------------
export function Breadcrumbs({ items, className }: { items: { label: string; href?: string }[]; className?: string }) {
  const all = [{ label: "Home", href: "/" }, ...items];
  return (
    <>
      <nav aria-label="Breadcrumb" className={cn("text-sm text-muted", className)}>
        <ol className="flex flex-wrap items-center gap-1">
          {all.map((it, i) => (
            <li key={i} className="flex items-center gap-1">
              {i > 0 ? <Sep className="size-3.5 text-muted/60" aria-hidden /> : null}
              {it.href && i < all.length - 1 ? (
                <Link href={it.href} className="hover:text-navy-900 hover:underline">{it.label}</Link>
              ) : (
                <span aria-current={i === all.length - 1 ? "page" : undefined} className="text-navy-900">{it.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: all.map((it, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: it.label,
            ...(it.href ? { item: `${env.siteUrl}${it.href}` } : {}),
          })),
        }}
      />
    </>
  );
}

export function Pagination({ page, pages, hrefFor, className }: { page: number; pages: number; hrefFor: (p: number) => string; className?: string }) {
  if (pages <= 1) return null;
  const item = "inline-flex h-10 min-w-10 items-center justify-center rounded-lg px-3 text-sm";
  return (
    <nav aria-label="Pagination" className={cn("flex flex-wrap items-center justify-center gap-1", className)}>
      {page > 1 ? (
        <Link className={cn(item, "border border-line bg-white hover:bg-canvas")} href={hrefFor(page - 1)} rel="prev">
          <ChevronLeft className="size-4" aria-hidden /> <span className="sr-only sm:not-sr-only sm:ml-1">Previous</span>
        </Link>
      ) : null}
      {pageRange(page, pages).map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className={cn(item, "text-muted")}>…</span>
        ) : (
          <Link
            key={p}
            href={hrefFor(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(item, p === page ? "bg-navy-900 font-semibold text-white" : "border border-line bg-white hover:bg-canvas")}
          >
            {p}
          </Link>
        ),
      )}
      {page < pages ? (
        <Link className={cn(item, "border border-line bg-white hover:bg-canvas")} href={hrefFor(page + 1)} rel="next">
          <span className="sr-only sm:not-sr-only sm:mr-1">Next</span> <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : null}
    </nav>
  );
}

export function Avatar({ src, name, className }: { src?: string | null; name: string; className?: string }) {
  const letters = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={cn("size-9 rounded-full object-cover", className)} loading="lazy" />
  ) : (
    <span aria-hidden className={cn("grid size-9 place-items-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700", className)}>{letters}</span>
  );
}
