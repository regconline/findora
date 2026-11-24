"use client";

import { useState } from "react";
import { ImagePlus } from "lucide-react";
import { ActionForm, SubmitButton, useFormState } from "@/components/form";
import type { ActionState } from "@/lib/types";

type Action = (s: ActionState, fd: FormData) => Promise<ActionState>;

/** Single or multiple image upload with local previews before submitting. */
type Props = { action: Action; multiple?: boolean; label: string; hint?: string; currentUrl?: string | null; aspect?: "square" | "wide" };

export function ImageUpload(props: Props) {
  return (
    <ActionForm action={props.action} encType="multipart/form-data" resetOnSuccess className="space-y-3">
      <Inner {...props} />
    </ActionForm>
  );
}

function Inner({ multiple = false, label, hint, currentUrl, aspect = "square" }: Props) {
  const [previews, setPreviews] = useState<string[]>([]);
  const state = useFormState();
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    // reset previews after a successful upload (state adjustment during render)
    setSeen(state);
    if (state.ok) setPreviews([]);
  }
  const shown = previews.length ? previews : currentUrl ? [currentUrl] : [];
  return (
    <>
      <label className="group block cursor-pointer">
        <span className="mb-1.5 block text-sm font-medium text-navy-900">{label}</span>
        <div
          className={
            "grid place-items-center overflow-hidden rounded-xl border-2 border-dashed border-line bg-canvas text-muted transition-colors group-hover:border-emerald-500 " +
            (aspect === "wide" ? "aspect-[16/7]" : multiple ? "min-h-36" : "size-36")
          }
        >
          {shown.length ? (
            <div className={multiple && shown.length > 1 ? "grid w-full grid-cols-3 gap-2 p-2 sm:grid-cols-4" : "size-full"}>
              {shown.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt="" className={multiple && shown.length > 1 ? "aspect-square w-full rounded-lg object-cover" : aspect === "square" ? "size-full object-contain p-2" : "size-full object-cover"} />
              ))}
            </div>
          ) : (
            <span className="flex flex-col items-center gap-2 p-4 text-center text-sm">
              <ImagePlus className="size-6" aria-hidden />
              {multiple ? "Choose photos" : "Choose an image"}
            </span>
          )}
        </div>
        <input
          type="file"
          name={multiple ? "files" : "file"}
          accept="image/jpeg,image/png,image/webp"
          multiple={multiple}
          className="sr-only"
          onChange={(e) => {
            previews.forEach((p) => URL.revokeObjectURL(p));
            setPreviews(Array.from(e.target.files ?? []).slice(0, 12).map((f) => URL.createObjectURL(f)));
          }}
        />
      </label>
      {hint ? <p className="text-[13px] text-muted">{hint}</p> : null}
      <SubmitButton size="sm" variant="navy" pendingText="Uploading…" disabled={!previews.length}>
        {multiple ? "Upload photos" : currentUrl ? "Replace image" : "Upload image"}
      </SubmitButton>
    </>
  );
}
