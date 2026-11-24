"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

/** Business side: RLS + trigger only allow managers to change the status of their own enquiries. */
export async function setEnquiryStatusAction(id: string, status: "new" | "read" | "archived") {
  await requireUser("/dashboard/enquiries");
  const supabase = await createClient();
  await supabase.from("customer_enquiries").update({ status }).eq("id", id);
  revalidatePath("/dashboard", "layout");
}

/** Customer side: archive / restore in "My enquiries" (trigger restricts to this column). */
export async function setCustomerArchivedAction(id: string, archived: boolean) {
  const { user } = await requireUser("/dashboard/my-enquiries");
  const supabase = await createClient();
  await supabase.from("customer_enquiries").update({ customer_archived: archived }).eq("id", id).eq("customer_id", user.id);
  revalidatePath("/dashboard/my-enquiries");
}
