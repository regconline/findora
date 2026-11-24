import type { Metadata } from "next";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { ColumnChart } from "@/components/charts";
import { Table } from "@/components/admin-table";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Analytics" };

function series(rows: { occurred_on?: string; viewed_on?: string }[], days: number) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const d = r.occurred_on ?? r.viewed_on!;
    map.set(d, (map.get(d) ?? 0) + 1);
  }
  const out: { day: string; value: number }[] = [];
   
  const today = new Date(Date.now() + 2 * 3600_000);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400_000).toISOString().slice(0, 10);
    out.push({ day: d, value: map.get(d) ?? 0 });
  }
  return out;
}

export default async function AdminAnalytics() {
  await requireAdmin();
  const supabase = await createClient();
  // eslint-disable-next-line react-hooks/purity -- server component, request-time date
  const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const [{ data: top }, { data: events }, { data: views }, { data: contacts }] = await Promise.all([
    supabase.rpc("admin_top_searches", { p_days: 30 }),
    supabase.from("platform_events").select("event_type, occurred_on").gte("occurred_on", since).limit(50000),
    supabase.from("business_views").select("viewed_on").gte("viewed_on", since).limit(50000),
    supabase.from("contact_events").select("occurred_on, event_type").gte("occurred_on", since).limit(50000),
  ]);
  const ev = (events as { event_type: string; occurred_on: string }[]) ?? [];
  const by = (t: string) => ev.filter((e) => e.event_type === t);
  const zeroResult = ((top as { query: string; searches: number; avg_results: number }[]) ?? []).filter((t) => Number(t.avg_results) === 0);
  return (
    <div className="space-y-6">
      <PageHeader title="Platform analytics" description="First-party, privacy-conscious event counts for the last 30 days (no personal data stored). Google Analytics 4 provides deeper traffic analysis when enabled." />
      <Card className="grid gap-8 p-5 sm:p-6 lg:grid-cols-2">
        <ColumnChart title="Homepage visits" data={series(by("home_view"), 30)} />
        <ColumnChart title="Searches" color="#102C3B" data={series(by("search"), 30)} />
        <ColumnChart title="Business profile views" data={series((views as { viewed_on: string }[]) ?? [], 30)} />
        <ColumnChart title="Contact clicks" color="#F2A93B" data={series((contacts as { occurred_on: string }[]) ?? [], 30)} />
        <ColumnChart title="Category views" color="#102C3B" data={series(by("category_view"), 30)} />
        <ColumnChart title="New registrations" data={series(by("registration"), 30)} />
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-semibold">Top searches</h2>
          <Table head={["Query", "Searches", "Avg. results"]}>
            {((top as { query: string; searches: number; avg_results: number }[]) ?? []).map((t) => (
              <tr key={t.query}><td className="px-4 py-2">{t.query}</td><td className="px-4 py-2">{t.searches}</td><td className="px-4 py-2">{t.avg_results}</td></tr>
            ))}
          </Table>
        </div>
        <Card>
          <CardHeader title="Searches with no results" description="Demand you could fill by recruiting businesses or adding categories." />
          <ul className="flex flex-wrap gap-2 p-5">
            {zeroResult.map((z) => <li key={z.query} className="rounded-full bg-amber-100 px-3 py-1 text-sm">{z.query} <span className="text-muted">×{z.searches}</span></li>)}
            {!zeroResult.length ? <li className="text-sm text-muted">None in the last 30 days.</li> : null}
          </ul>
        </Card>
      </div>
    </div>
  );
}
