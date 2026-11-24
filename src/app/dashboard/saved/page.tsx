import Link from "next/link";
import type { Metadata } from "next";
import { Heart, MapPin } from "lucide-react";
import { Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { ConfirmButton } from "@/components/form";
import { BusinessLogo } from "@/components/business-card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { removeSavedAction } from "./actions";

export const metadata: Metadata = { title: "Saved businesses" };

export default async function SavedPage() {
  const { user } = await requireUser("/dashboard/saved");
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_businesses")
    .select("created_at, business:businesses(id, name, slug, tagline, logo_path, status, deleted_at, categories(name), business_locations(city, province, is_primary))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  type Row = { business: { id: string; name: string; slug: string; tagline: string | null; logo_path: string | null; status: string; deleted_at: string | null; categories: { name: string } | null; business_locations: { city: string; province: string; is_primary: boolean }[] } | null };
  const rows = ((data as unknown as Row[]) ?? []).filter((r) => r.business);
  return (
    <div className="space-y-6">
      <PageHeader title="Saved businesses" description="Businesses you've saved for later." />
      {rows.length ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {rows.map(({ business: b }) => {
            const loc = b!.business_locations.find((l) => l.is_primary) ?? b!.business_locations[0];
            const live = b!.status === "approved" && !b!.deleted_at;
            return (
              <li key={b!.id}>
                <Card className="flex items-start gap-4 p-5">
                  <BusinessLogo path={b!.logo_path} name={b!.name} size={48} />
                  <div className="min-w-0 flex-1">
                    {live ? <Link href={`/businesses/${b!.slug}`} className="font-semibold text-heading hover:underline">{b!.name}</Link> : <p className="font-semibold text-muted">{b!.name} (no longer listed)</p>}
                    <p className="text-sm text-muted">{b!.categories?.name}</p>
                    {loc ? <p className="mt-1 flex items-center gap-1 text-sm text-muted"><MapPin className="size-3.5" aria-hidden /> {loc.city}, {loc.province}</p> : null}
                  </div>
                  <form action={removeSavedAction.bind(null, b!.id)}><ConfirmButton variant="ghost" aria-label={`Remove ${b!.name} from saved`}>Remove</ConfirmButton></form>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={Heart} title="No saved businesses" description="Tap “Save” on any business profile to keep it here." action={<LinkButton href="/businesses" variant="outline">Explore businesses</LinkButton>} />
      )}
    </div>
  );
}
