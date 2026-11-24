"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui";
import { isSavedAction, toggleSavedAction } from "@/app/(public)/actions";

export function SaveButton({ businessId, slug, className }: { businessId: string; slug: string; className?: string }) {
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  useEffect(() => {
    isSavedAction(businessId).then((r) => setSaved(r.saved)).catch(() => {});
  }, [businessId]);
  return (
    <button
      type="button"
      aria-pressed={saved}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await toggleSavedAction(businessId);
          if (r.requiresLogin) router.push(`/login?next=${encodeURIComponent(`/businesses/${slug}`)}`);
          else setSaved(r.saved);
        })
      }
      className={cn(buttonVariants({ variant: "outline" }), className)}
    >
      <Heart className={cn(saved && "fill-danger text-danger")} aria-hidden />
      {saved ? "Saved" : "Save"}
    </button>
  );
}
