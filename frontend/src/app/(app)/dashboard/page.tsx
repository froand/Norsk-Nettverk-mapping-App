import { Activity, Bell, LineChart, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { strings } from "@/lib/strings/nb";
import {
  loadDashboardData,
  type RevolvingDoorTransition,
} from "@/lib/dashboard-data";
import type {
  ConflictOfInterest,
  ConflictSeverity,
  RoleCategory,
} from "@/lib/api";

// Always render at request time — backend may not be available at build time
// and we want fresh data per page load.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { stats, feed, ranking, partial } = await loadDashboardData();

  return (
    <>
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 rounded-xl bg-[var(--color-surface-low)] border border-[var(--color-border)] px-3 py-2.5">
          <input
            type="search"
            placeholder={strings.search.placeholder}
            className="flex-1 bg-transparent text-sm placeholder:text-[var(--color-fg-dim)] outline-none"
          />
        </div>
      </div>

      {partial ? (
        <div className="px-4 pt-3">
          <div className="rounded-xl border border-[var(--color-tertiary)]/40 bg-[var(--color-tertiary)]/10 px-3 py-2 flex items-center gap-2 text-xs text-[var(--color-tertiary)]">
            <AlertTriangle className="size-3.5 shrink-0" />
            {strings.dashboard.partialDataWarning}
          </div>
        </div>
      ) : null}

      <section className="px-4 pt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-dim)] mb-3">
          {strings.dashboard.intelligenceHeading}
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={<LineChart className="size-4" />}
            label={strings.dashboard.investigations}
            value={stats.investigations}
            tone="primary"
          />
          <StatCard
            icon={<Activity className="size-4" />}
            label={strings.dashboard.revolvingDoor}
            value={stats.revolvingDoor}
            tone="warning"
          />
          <StatCard
            icon={<Bell className="size-4" />}
            label={strings.dashboard.activeAlerts}
            value={stats.activeAlerts}
            tone="danger"
          />
        </div>
      </section>

      <section className="px-4 pt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-dim)] mb-3">
          {strings.dashboard.revolvingDoorFeed}
        </h2>
        {feed.length === 0 ? (
          <EmptyState message={strings.dashboard.emptyFeed} />
        ) : (
          <div className="space-y-2">
            {feed.map((t, i) => (
              <FeedItem
                key={`${t.personId}-${t.endYear}-${i}`}
                transition={t}
              />
            ))}
          </div>
        )}
      </section>

      <section className="px-4 pt-6 pb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-dim)] mb-3">
          {strings.dashboard.highConflict}
        </h2>
        {ranking.length === 0 ? (
          <EmptyState message={strings.dashboard.emptyRanking} />
        ) : (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
            {ranking.map((c) => (
              <ConflictCard
                key={`${c.personId}-${c.boardOrg}`}
                conflict={c}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "primary" | "warning" | "danger";
}) {
  const valueColor =
    tone === "warning"
      ? "text-[var(--color-tertiary)]"
      : tone === "danger"
        ? "text-[var(--color-conflict-high)]"
        : "text-[var(--color-primary)]";
  return (
    <div className="card-surface p-3">
      <div className="flex items-center gap-1.5 text-[var(--color-fg-muted)] mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider truncate">
          {label}
        </span>
      </div>
      <div className={`text-3xl font-bold ${valueColor} leading-none`}>
        {value}
      </div>
    </div>
  );
}

function FeedItem({ transition: t }: { transition: RevolvingDoorTransition }) {
  const isRevolvingDoor = isPoliticalLike(t.fromCategory) && isBoardLike(t.toCategory);
  const badge = isRevolvingDoor
    ? strings.dashboard.badgeRevolvingDoor
    : strings.dashboard.badgePotentialConflict;
  const badgeClass = isRevolvingDoor ? "badge-warning" : "badge-danger";

  return (
    <Link
      href={`/profile/${encodeURIComponent(t.personId)}`}
      className="block card-surface p-3 hover:border-[var(--color-primary)]/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="size-10 rounded-full bg-[var(--color-secondary-container)] shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{t.personName}</p>
            <p className="text-xs text-[var(--color-fg-muted)] truncate">
              {t.fromOrg} → {t.toOrg}
            </p>
            <p className="text-[11px] text-[var(--color-fg-dim)] mt-1">
              {t.endYear} → {t.startYear}
            </p>
          </div>
        </div>
        <span
          className={`chip text-[10px] uppercase tracking-wider whitespace-nowrap shrink-0 ${badgeClass}`}
        >
          {badge}
        </span>
      </div>
    </Link>
  );
}

function ConflictCard({ conflict }: { conflict: ConflictOfInterest }) {
  const border = severityBorder(conflict.severity);
  const score = severityScore(conflict.severity);
  return (
    <Link
      href={`/profile/${encodeURIComponent(conflict.personId)}`}
      className={`card-surface ${border} w-44 shrink-0 p-3 flex flex-col items-center gap-2 hover:border-[var(--color-primary)]/60 transition-colors`}
    >
      <div className="size-16 rounded-full bg-[var(--color-secondary-container)]" />
      <p className="text-sm font-semibold text-center truncate w-full">
        {conflict.personName}
      </p>
      <p className="text-[11px] text-[var(--color-fg-muted)] text-center truncate w-full capitalize">
        {conflict.sector}
      </p>
      <span className={`chip mt-1 text-[10px] tracking-wider ${severityBadge(conflict.severity)}`}>
        {score}/100
      </span>
    </Link>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="card-surface p-4 text-center text-xs text-[var(--color-fg-dim)]">
      {message}
    </div>
  );
}

function isPoliticalLike(c: RoleCategory) {
  return c === "political" || c === "government";
}

function isBoardLike(c: RoleCategory) {
  return c === "board" || c === "executive";
}

function severityBorder(s: ConflictSeverity) {
  switch (s) {
    case "critical":
    case "high":
      return "border-[var(--color-conflict-high)]/40";
    case "medium":
      return "border-[var(--color-tertiary)]/40";
    default:
      return "border-[var(--color-border)]";
  }
}

function severityBadge(s: ConflictSeverity) {
  switch (s) {
    case "critical":
    case "high":
      return "badge-danger";
    case "medium":
      return "badge-warning";
    default:
      return "badge-success";
  }
}

function severityScore(s: ConflictSeverity) {
  switch (s) {
    case "critical":
      return 95;
    case "high":
      return 80;
    case "medium":
      return 60;
    default:
      return 40;
  }
}
