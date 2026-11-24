import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getSettings } from "@/lib/data";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const { announcement } = await getSettings();
  return (
    <div className="flex min-h-dvh flex-col">
      {announcement ? <div role="note" className="bg-emerald-500 px-4 py-2 text-center text-sm font-medium text-white">{announcement}</div> : null}
      <SiteHeader />
      <main id="main" className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
