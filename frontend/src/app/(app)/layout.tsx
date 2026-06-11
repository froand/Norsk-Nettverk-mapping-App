import type { ReactNode } from "react";
import { TopHeader } from "@/components/TopHeader";
import { BottomTabBar } from "@/components/BottomTabBar";
import { PhotoMapProvider } from "@/components/PhotoMapProvider";
import { api } from "@/lib/api";

// Resolved at request time so the photo map is always fresh.
export const dynamic = "force-dynamic";

async function loadPhotoMap(): Promise<Record<string, string>> {
  try {
    const overview = await api.overview({ revalidate: 300 });
    const out: Record<string, string> = {};
    for (const n of overview.nodes) {
      if (n.type === "person" && n.imageUrl) {
        out[n.id] = n.imageUrl;
      }
    }
    return out;
  } catch {
    // Backend may be unavailable during a deploy; render with no photos and
    // let downstream components fall back to initials.
    return {};
  }
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const photos = await loadPhotoMap();
  return (
    <PhotoMapProvider photos={photos}>
      <div className="flex min-h-dvh flex-col bg-[var(--color-bg)] text-[var(--color-fg)]">
        <TopHeader />
        <main className="flex-1 pb-20">{children}</main>
        <BottomTabBar />
      </div>
    </PhotoMapProvider>
  );
}
