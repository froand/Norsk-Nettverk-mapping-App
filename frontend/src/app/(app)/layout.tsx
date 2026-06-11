import type { ReactNode } from "react";
import { TopHeader } from "@/components/TopHeader";
import { BottomTabBar } from "@/components/BottomTabBar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-bg)] text-[var(--color-fg)]">
      <TopHeader />
      <main className="flex-1 pb-20">{children}</main>
      <BottomTabBar />
    </div>
  );
}
