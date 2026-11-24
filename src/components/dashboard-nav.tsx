"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Store, PencilLine, Tags, Images, Inbox, BarChart3, Heart, Bell, Settings, Shield, Plus, Send,
  Users, FolderTree, FileText, Flag, Megaphone, ScrollText, HelpCircle, Files, MessagesSquare, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  overview: LayoutDashboard, store: Store, edit: PencilLine, services: Tags, photos: Images, inbox: Inbox,
  analytics: BarChart3, saved: Heart, bell: Bell, settings: Settings, admin: Shield, plus: Plus, sent: Send,
  users: Users, categories: FolderTree, blog: FileText, reports: Flag, ads: Megaphone, audit: ScrollText,
  faq: HelpCircle, pages: Files, enquiries: MessagesSquare,
};

export type NavItem = { href: string; label: string; icon: string; badge?: number; exact?: boolean };

/** Sidebar on desktop, horizontally scrollable tab bar on mobile. */
export function DashboardNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const isActive = (it: NavItem) => (it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(it.href + "/"));
  return (
    <nav aria-label="Dashboard" className="overflow-x-auto px-3 pb-3 lg:overflow-visible lg:px-3 lg:pb-40 lg:pt-2">
      <ul className="flex gap-1 lg:flex-col">
        {items.map((it) => {
          const Icon = ICONS[it.icon] ?? LayoutDashboard;
          const active = isActive(it);
          return (
            <li key={it.href + it.label} className="shrink-0">
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-navy-900 text-white" : "text-ink/80 hover:bg-navy-900/5 hover:text-navy-900",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="whitespace-nowrap">{it.label}</span>
                {it.badge ? (
                  <span className={cn("ml-auto rounded-full px-1.5 text-[11px] font-semibold tabular-nums", active ? "bg-white/20" : "bg-emerald-500 text-white")}>{it.badge}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
