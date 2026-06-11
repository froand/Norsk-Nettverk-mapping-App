"use client";

import Link from "next/link";
import { Eye, EyeOff, X } from "lucide-react";
import { strings } from "@/lib/strings/nb";
import { useWatchlist } from "@/lib/use-watchlist";
import type { AlertItem } from "@/lib/alerts-data";

interface Props {
  /** Recent alerts so we can show how many target each watched person. */
  alerts: AlertItem[];
}

export function WatchlistSection({ alerts }: Props) {
  const { entries, hydrated, remove } = useWatchlist();

  if (!hydrated) {
    return (
      <section className="px-4 pt-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-dim)] mb-3">
          {strings.alerts.watchlistTitle}
        </h2>
        <div className="card-surface p-4 h-16" />
      </section>
    );
  }

  if (entries.length === 0) {
    return (
      <section className="px-4 pt-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-dim)] mb-3">
          {strings.alerts.watchlistTitle}
        </h2>
        <div className="card-surface p-6 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-[var(--color-fg-muted)]">
            {strings.alerts.watchlistEmpty}
          </p>
          <p className="text-xs text-[var(--color-fg-dim)]">
            {strings.alerts.watchlistHint}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 pt-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-dim)] mb-3 flex items-center gap-2">
        <Eye className="size-4 text-[var(--color-primary)]" />
        {strings.alerts.watchlistTitle}
        <span className="text-[var(--color-fg-dim)] font-normal normal-case tracking-normal">
          · {entries.length}
        </span>
      </h2>
      <ul className="space-y-2">
        {entries.map((entry) => {
          const matching = alerts.filter((a) => a.personId === entry.personId);
          return (
            <li
              key={entry.personId}
              className="card-surface p-3 flex items-center gap-3"
            >
              <div className="size-10 rounded-full bg-[var(--color-secondary-container)] shrink-0" />
              <Link
                href={`/profile/${encodeURIComponent(entry.personId)}`}
                className="flex-1 min-w-0"
              >
                <p className="font-semibold text-sm truncate">{entry.name}</p>
                <p className="text-[11px] text-[var(--color-fg-dim)] mt-0.5">
                  {matching.length > 0
                    ? `${matching.length} ${strings.alerts.matchingAlerts}`
                    : strings.alerts.noNewAlerts}
                </p>
              </Link>
              <button
                type="button"
                onClick={() => remove(entry.personId)}
                aria-label={strings.alerts.removeFromWatchlist}
                className="shrink-0 size-8 rounded-full grid place-items-center text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface-high)] transition-colors"
              >
                <X className="size-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function WatchToggleButton({
  personId,
  name,
}: {
  personId: string;
  name: string;
}) {
  const { isWatched, toggle, hydrated } = useWatchlist();
  if (!hydrated) {
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1.5 chip text-[10px] uppercase tracking-wider opacity-50 cursor-not-allowed"
      >
        <Eye className="size-3" />
        {strings.alerts.addToWatchlist}
      </button>
    );
  }
  const on = isWatched(personId);
  return (
    <button
      type="button"
      onClick={() => toggle(personId, name)}
      className={`inline-flex items-center gap-1.5 chip text-[10px] uppercase tracking-wider ${
        on ? "chip-active" : ""
      }`}
    >
      {on ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
      {on ? strings.alerts.removeFromWatchlist : strings.alerts.addToWatchlist}
    </button>
  );
}
