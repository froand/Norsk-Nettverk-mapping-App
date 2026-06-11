import { AlertTriangle } from "lucide-react";
import { api, type ConflictOfInterest, type GraphData } from "@/lib/api";
import { strings } from "@/lib/strings/nb";
import { NetworkCanvas } from "./network-canvas";

export const dynamic = "force-dynamic";

export default async function NetworkPage() {
  const [overviewR, conflictsR] = await Promise.allSettled([
    api.overview(),
    api.conflicts(),
  ]);

  const overview: GraphData | null =
    overviewR.status === "fulfilled" ? overviewR.value : null;
  const conflicts: ConflictOfInterest[] =
    conflictsR.status === "fulfilled" ? conflictsR.value : [];
  const partial =
    overviewR.status === "rejected" || conflictsR.status === "rejected";

  if (!overview) {
    return (
      <div className="px-4 pt-6">
        <div className="rounded-xl border border-[var(--color-conflict-high)]/40 bg-[var(--color-conflict-high)]/10 px-3 py-2 flex items-center gap-2 text-xs text-[var(--color-conflict-high)]">
          <AlertTriangle className="size-3.5 shrink-0" />
          Kunne ikke laste nettverket. Prøv igjen senere.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-9rem)]">
      {partial ? (
        <div className="px-4 pt-3">
          <div className="rounded-xl border border-[var(--color-tertiary)]/40 bg-[var(--color-tertiary)]/10 px-3 py-2 flex items-center gap-2 text-xs text-[var(--color-tertiary)]">
            <AlertTriangle className="size-3.5 shrink-0" />
            {strings.dashboard.partialDataWarning}
          </div>
        </div>
      ) : null}
      <NetworkCanvas overview={overview} conflicts={conflicts} />
    </div>
  );
}
