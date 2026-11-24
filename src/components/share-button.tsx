"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { buttonVariants } from "@/components/ui";

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={buttonVariants({ variant: "outline" })}
      onClick={async () => {
        const url = window.location.href;
        if (navigator.share) {
          try {
            await navigator.share({ title, url });
            return;
          } catch {
            /* cancelled */
          }
        }
        await navigator.clipboard?.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check aria-hidden /> : <Share2 aria-hidden />} {copied ? "Link copied" : "Share"}
    </button>
  );
}
