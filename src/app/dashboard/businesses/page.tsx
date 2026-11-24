import Link from "next/link";
import type { Metadata } from "next";
import { Plus, Store } from "lucide-react";
import { Alert, Card, EmptyState, LinkButton, PageHeader, StatusBadge } from "@/components/ui";
import { BusinessLogo } from "@/components/business-card";
import { getManagedBusinesses, requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "My businesses" };

export default async function MyBusinessesPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  await requireUser("/dashboard/businesses");
  const [businesses, sp] = await Promise.all([getManagedBusinesses(), searchParams]);
  return (
    <div className="space-y-6">
      <PageHeader title="My businesses" description="Listings you own or manage.">
        <LinkButton href="/dashboard/businesses/new"><Plus /> Add a business</LinkButton>
      </PageHeader>
      {sp.deleted ? <Alert tone="success">The listing was deleted and removed from public view.</Alert> : null}
      {businesses.length ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {businesses.map((b) => (
            <li key={b.id}>
              <Card className="relative flex items-center gap-4 p-5 hover:shadow-raised">
                <BusinessLogo path={b.logo_path} name={b.name} />
                <div className="min-w-0 flex-1">
                  <Link href={`/dashboard/businesses/${b.id}`} className="font-semibold text-heading after:absolute after:inset-0">{b.name}</Link>
                  <div className="mt-1"><StatusBadge status={b.status} /></div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={Store} title="You haven't listed a business yet" description="Create a free listing so customers can find and contact you." action={<LinkButton href="/dashboard/businesses/new">Create your listing</LinkButton>} />
      )}
    </div>
  );
}
