"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Search } from "lucide-react";
import { strings } from "@/lib/strings/nb";
import { Avatar } from "@/components/Avatar";
import type { DirectoryRow, DirectoryTag } from "@/lib/katalog-data";

type FilterKey = "all" | "politicians" | "board" | "karantene" | "conflicts";
type SortKey = "name" | "score" | "connections";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: strings.directory.filterAll },
  { key: "politicians", label: strings.directory.filterPoliticians },
  { key: "board", label: strings.directory.filterBoard },
  { key: "karantene", label: strings.directory.filterKarantene },
  { key: "conflicts", label: strings.directory.filterConflicts },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: "score", label: strings.directory.sortByConflict },
  { key: "name", label: strings.directory.sortByName },
  { key: "connections", label: strings.directory.sortByConnections },
];

export function KatalogList({ rows }: { rows: DirectoryRow[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("score");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (filter === "politicians" && r.politicalCount === 0) return false;
      if (filter === "board" && r.boardCount === 0) return false;
      if (filter === "karantene" && r.karanteneCount === 0) return false;
      if (filter === "conflicts" && r.conflictCount === 0) return false;
      if (!needle) return true;
      return (
        r.name.toLowerCase().includes(needle) ||
        (r.party?.toLowerCase().includes(needle) ?? false) ||
        (r.topRoleOrg?.toLowerCase().includes(needle) ?? false) ||
        (r.topRoleLabel?.toLowerCase().includes(needle) ?? false)
      );
    });

    out = [...out];
    if (sort === "name") {
      out.sort((a, b) => a.name.localeCompare(b.name, "nb"));
    } else if (sort === "connections") {
      out.sort(
        (a, b) =>
          b.connections - a.connections || a.name.localeCompare(b.name, "nb"),
      );
    } else {
      out.sort(
        (a, b) =>
          b.score - a.score ||
          b.conflictCount - a.conflictCount ||
          a.name.localeCompare(b.name, "nb"),
      );
    }
    return out;
  }, [rows, q, filter, sort]);

  return (
    <>
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 rounded-xl bg-[var(--color-surface-low)] border border-[var(--color-border)] px-3 py-2.5">
          <Search className="size-4 text-[var(--color-fg-dim)]" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={strings.directory.searchPlaceholder}
            className="flex-1 bg-transparent text-sm placeholder:text-[var(--color-fg-dim)] outline-none"
          />
        </div>
      </div>

      <div className="px-4 pt-4 flex gap-2 overflow-x-auto scrollbar-hide">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`chip whitespace-nowrap ${filter === f.key ? "chip-active" : ""}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 flex items-center justify-between text-xs text-[var(--color-fg-muted)]">
        <span>
          {filtered.length} {strings.directory.countLabel}
        </span>
        <label className="flex items-center gap-1.5">
          <span className="uppercase tracking-wider">
            {strings.directory.sortLabel}:
          </span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="bg-transparent border-none focus:ring-0 cursor-pointer p-0 text-[var(--color-fg)] outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key} className="bg-[var(--color-surface-low)]">
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="px-4 pt-6 text-sm text-[var(--color-fg-dim)] text-center">
          {strings.directory.noResults}
        </p>
      ) : (
        <ul className="px-4 pt-3 space-y-2 pb-6">
          {filtered.map((r) => (
            <KatalogRow key={r.personId} row={r} />
          ))}
        </ul>
      )}
    </>
  );
}

function KatalogRow({ row }: { row: DirectoryRow }) {
  const badgeText = tagText(row.tag);
  const badgeClass = tagBadgeClass(row.tag);
  const scoreColor = scoreTextColor(row.score);
  return (
    <li>
      <Link
        href={`/profile/${encodeURIComponent(row.personId)}`}
        className="card-surface p-3 flex items-start gap-3 hover:border-[var(--color-primary)]/50 transition-colors"
      >
        <Avatar personId={row.personId} name={row.name} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-sm truncate">{row.name}</p>
            <span
              className={`chip text-[10px] uppercase tracking-wider whitespace-nowrap ${badgeClass}`}
            >
              {badgeText}
            </span>
          </div>
          {row.topRoleLabel || row.topRoleOrg ? (
            <p className="text-xs text-[var(--color-fg-muted)] truncate">
              {[row.topRoleLabel, row.topRoleOrg].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-[var(--color-fg-dim)]">
            {row.party ? <span>{row.party}</span> : null}
            <span>
              {row.connections} {strings.directory.connectionsLabel}
            </span>
            {row.boardCount > 0 ? (
              <span>
                {row.boardCount} {strings.directory.boardLabel}
              </span>
            ) : null}
            {row.karanteneCount > 0 ? (
              <span className="text-[var(--color-tertiary)] flex items-center gap-1">
                <AlertTriangle className="size-3" />
                {row.karanteneCount} {strings.directory.karanteneLabel}
              </span>
            ) : null}
            <span className={`ml-auto font-semibold ${scoreColor}`}>
              {row.score}
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
}

function tagText(t: DirectoryTag): string {
  switch (t) {
    case "revolving_door":
      return strings.directory.badgeRevolvingRisk;
    case "karantene":
      return strings.directory.badgeKarantene;
    case "active_conflict":
      return strings.directory.badgeActiveConflict;
    default:
      return strings.directory.badgeClean;
  }
}

function tagBadgeClass(t: DirectoryTag): string {
  switch (t) {
    case "revolving_door":
      return "badge-warning";
    case "karantene":
      return "badge-warning";
    case "active_conflict":
      return "badge-danger";
    default:
      return "badge-success";
  }
}

function scoreTextColor(score: number): string {
  if (score >= 50) return "text-[var(--color-conflict-high)]";
  if (score >= 25) return "text-[var(--color-conflict-medium)]";
  return "text-[var(--color-fg-muted)]";
}
