"use client";

import { useState } from "react";
import { SelectField, useFormState } from "@/components/form";

type Cat = { id: string; name: string; subcategories?: { id: string; name: string }[] };

/** Category + dependent subcategory selects. */
export function CategoryPicker({ categories, categoryId, subcategoryId }: { categories: Cat[]; categoryId?: string | null; subcategoryId?: string | null }) {
  const state = useFormState();
  const [cat, setCat] = useState(state.values?.category_id ?? categoryId ?? "");
  const subs = categories.find((c) => c.id === cat)?.subcategories ?? [];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SelectField
        name="category_id"
        label="Business category"
        defaultValue={cat}
        placeholder="Select a category"
        options={categories.map((c) => ({ value: c.id, label: c.name }))}
        onChange={(e) => setCat(e.target.value)}
        required
      />
      <SelectField
        key={cat}
        name="subcategory_id"
        label="Subcategory"
        optional
        defaultValue={cat === (categoryId ?? "") ? subcategoryId : ""}
        placeholder={subs.length ? "Select a subcategory" : "Choose a category first"}
        options={subs.map((s) => ({ value: s.id, label: s.name }))}
        disabled={!subs.length}
      />
    </div>
  );
}
