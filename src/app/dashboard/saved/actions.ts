"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export async function removeSavedAction(businessId: string) {
  const { user } = await requireUser("/dashboard/saved");
  const supabase = await createClient();
  await supabase.from("saved_businesses").delete().eq("user_id", user.id).eq("business_id", businessId);
  revalidatePath("/dashboard/saved");
}
