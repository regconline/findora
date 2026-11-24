import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const WIZARD_STEPS = [
  { key: "account", label: "Account" },
  { key: "business", label: "Business" },
  { key: "location", label: "Location" },
  { key: "contact", label: "Contact" },
  { key: "branding", label: "Branding" },
  { key: "services", label: "Services" },
  { key: "review", label: "Review" },
  { key: "submit", label: "Submit" },
] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number]["key"];

/** 8-step business onboarding progress indicator. */
export function WizardProgress({ current, businessId, completed = [] }: { current: WizardStep; businessId?: string; completed?: WizardStep[] }) {
  const idx = WIZARD_STEPS.findIndex((s) => s.key === current);
  return (
    <nav aria-label="Listing progress" className="w-full">
      <p className="mb-3 text-sm text-muted sm:hidden">
        Step {idx + 1} of {WIZARD_STEPS.length}: <span className="font-semibold text-navy-900">{WIZARD_STEPS[idx]!.label}</span>
      </p>
      <ol className="flex items-center gap-1.5 sm:gap-2">
        {WIZARD_STEPS.map((s, i) => {
          const done = i < idx || completed.includes(s.key);
          const linkable = businessId && i > 0 && i < 7 && (done || i <= idx);
          const dot = (
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold",
                i === idx ? "bg-navy-900 text-white" : done ? "bg-emerald-500 text-white" : "bg-white text-muted ring-1 ring-line",
              )}
            >
              {done && i !== idx ? <Check className="size-3.5" aria-hidden /> : i + 1}
            </span>
          );
          return (
            <li key={s.key} className="flex min-w-0 flex-1 items-center gap-2" aria-current={i === idx ? "step" : undefined}>
              {linkable ? (
                <Link href={`/dashboard/businesses/${businessId}/setup/${s.key}`} className="flex min-w-0 items-center gap-2 hover:opacity-80">
                  {dot}
                  <span className={cn("hidden whitespace-nowrap text-xs font-medium", i === idx && "sm:block text-navy-900")}>{s.label}</span>
                </Link>
              ) : (
                <span className="flex min-w-0 items-center gap-2">
                  {dot}
                  <span className={cn("hidden whitespace-nowrap text-xs font-medium", i === idx && "sm:block text-navy-900")}>{s.label}</span>
                </span>
              )}
              {i < WIZARD_STEPS.length - 1 ? <span aria-hidden className={cn("h-px flex-1", i < idx ? "bg-emerald-500" : "bg-line")} /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
