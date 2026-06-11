"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Share2, BookOpen, Bell } from "lucide-react";
import { strings } from "@/lib/strings/nb";
import type { ComponentType, SVGProps } from "react";

type Tab = {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  badge?: number;
};

const TABS: Tab[] = [
  { href: "/dashboard", label: strings.tabs.dashboard, Icon: LayoutDashboard },
  { href: "/nettverk", label: strings.tabs.network, Icon: Share2 },
  { href: "/katalog", label: strings.tabs.directory, Icon: BookOpen },
  { href: "/varsler", label: strings.tabs.alerts, Icon: Bell, badge: 3 },
];

export function BottomTabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-surface-low)]/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-4 text-xs font-medium">
        {TABS.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-1 py-2.5 transition-colors ${
                  active
                    ? "text-[var(--color-primary)]"
                    : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
                }`}
              >
                <div className="relative">
                  <tab.Icon className="size-5" aria-hidden />
                  {tab.badge ? (
                    <span className="absolute -right-2 -top-1 min-w-4 h-4 rounded-full bg-[var(--color-conflict-high)] text-[10px] text-white flex items-center justify-center px-1 font-semibold">
                      {tab.badge}
                    </span>
                  ) : null}
                </div>
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
