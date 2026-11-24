import { cn } from "@/lib/utils";

export function AuthCard({ title, description, children, footer, wide }: { title: string; description?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn("w-full", wide ? "max-w-2xl" : "max-w-md")}>
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description ? <p className="mt-1.5 text-sm text-muted">{description}</p> : null}
        <div className="mt-6">{children}</div>
      </div>
      {footer ? <div className="mt-5 text-center text-sm text-muted">{footer}</div> : null}
    </div>
  );
}
